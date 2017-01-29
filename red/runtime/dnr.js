// var mqtt = require('mqtt');
// var client = mqtt.connect('mqtt://localhost:1883');
// var settings = require('./settings.js');
var log = require("./log");
var ws = require("ws");
var util = require("./util");

var connected = false;
var activeDevices = {}; // deviceId --> ws, context, lastSeen
var availableNodes = {} // nodeId --> [deviceId]
var wsServer;

var server;
var settings;

var heartbeatTimer;
var lastSentTime;

var WS_KEEP_ALIVE = 15000;
var DEVICE_INACTIVE = 30000

var dnrInterface = require('dnr-interface')
var RoutingTableReq = dnrInterface.RoutingTableReq
var RoutingTableRes = dnrInterface.RoutingTableRes

// hooked from flow deployment 
function publish(config, diff, flows){
  // TODO: process diff
}

function init(_server,_runtime) {
  server = _server;
  settings = _runtime.settings;

  var path = settings.httpAdminRoot || "/";
  path = (path.slice(0,1) != "/" ? "/":"") + path + (path.slice(-1) == "/" ? "":"/") + "dnr";
  
  wsServer = new ws.Server({
    server:server,
    path:path,
    // Disable the deflate option due to this issue
    //  https://github.com/websockets/ws/pull/632
    // that is fixed in the 1.x release of the ws module
    // that we cannot currently pickup as it drops node 0.10 support
    perMessageDeflate: false
  });

  _runtime.adminApi.adminApp.post("/dnr/flows/:id", require("../api").auth.needsPermission("flows.read"), function(req,res) {
    var deployingFlow = req.params.id;
    broadcast('flow_deployed', {
      activeFlow: _runtime.nodes.getFlow(deployingFlow),
      allFlows: _runtime.nodes.getFlows().flows.filter(function(e){
        return e.type === 'tab'
      }).map(function(ee){
        return ee.id
      })
    })
    res.sendStatus(200)
  })

  _runtime.adminApi.adminApp.post("/dnr/routingtable", function(req,res) {
    console.log(req.body)

    /* RoutingTableReq: 
      { 
        deviceId: '1',
        flowId: 'xxx'
        dnrLinks: [ 
          '54236bf5.2703a4_0_1d58c765.938219-<linkState>',
          '1d58c765.938219_0_6cd77d5e.6c54b4-<linkState>' 
        ] 
      }
    */
    var routingTableReq = new RoutingTableReq().fromObj(req.body)
    let deviceId = routingTableReq.deviceId
    let flowId = routingTableReq.flowId
    let dnrLinks = routingTableReq.dnrLinks

    let flow = _runtime.nodes.getFlow(flowId)

    var response = new RoutingTableRes()

    for (let dnrLink of dnrLinks){
      let link = dnrLink.split('-')[0]
      let linkState = dnrLink.split('-')[1]
      let linkType
      
      let sourceId = link.split('_')[0]
      let sourcePort = link.split('_')[1]
      let destId = link.split('_')[2]

      // based on this flow
      console.log(flow)
      for (let node of flow.nodes){
        if (node.id !== sourceId){
          continue
        }

        let linkConstraints = node.constraints.link
        linkType = linkConstraints[sourcePort + '_' + destId]
      }

      let commTopic
      // notes, there are several cases where daemons don't need to ask
      // for where they should send/fetch data to/from
      // e.g 
      //    if the link type is NN, the topic for pub/sub is 
      // always <srcId>_<srcPort>_<destId>
      //    if the link type is 1N and the dnrNode status is RECEIVE_REDIRECT,
      // the topic for publishing is always 
      //    "from_<myself>_<srcId>_<srcPort>_<destId>"
      //    similarly, if the link type is N1 and status is FETCH_FORWARD,
      // the topic for subscribing is always
      //    "to_<myself>_<srcId>_<srcPort>_<destId>"

      if (linkState === dnrInterface.Context.FETCH_FORWARD){
        // finding which device to fetch from
        // subcribing topic will be
        switch (linkType){
          case '11':
            // "from_<deviceId>_to_deviceId_<srcId>_<srcPort>_<destId>"
            break
          case '1N':
            // "from_<deviceId>_<srcId>_<srcPort>_<destId>"
            break
          default:
            break
        }

      } else if (linkState === dnrInterface.Context.RECEIVE_REDIRECT){
        // finding which device to redirect to
        // publishing topic will be
        switch (linkType){
          case '11':
            // "from_deviceId_to_<deviceId>_<srcId>_<srcPort>_<destId>"
            break
          case 'N1':
            // "to_<deviceId>_<srcId>_<srcPort>_<destId>"
            break
          default:
            break
        }
      }

      if (commTopic){
        response.set(link, commTopic)
      }
    }

    /* response should look like:
      { 
        <link> : <topic>
      }
    */
    res.json(response);
  })

  start()
}

function getUniqueId(){
  let connId = util.generateId()
  if (activeDevices[connId]){
    return getId()
  }
  return connId
}

function start(){
  wsServer.on('connection',function(ws) {
    let device = 'annonymous'

    ws.on('close',function() {
      log.info(device + ' disconnected')
      delete activeDevices[device]
    });

    ws.on('error', function(err) {
      log.warn( 'dnr comms error: ' + err.toString() );
      delete activeDevices[device]
    });

    ws.on('message', function(data,flags) {
      var msg = null;
      try {
        msg = JSON.parse(data);
      } catch(err) {
        log.warn( 'dnr comms error: ' + err.toString() );
        return;
      }

      console.log(msg)

      if (msg.topic === 'register'){
        device = msg.device
        
        if (activeDevices[device]){
          device = getUniqueId()
          ws.send(JSON.stringify({
            'topic': 'register_ack', 'idOk': false, 'id': device
          }))
        } else {
          ws.send(JSON.stringify({
            'topic': 'register_ack', 'idOk': true, 'id': device
          }))
        }

        log.info('new device connected - ' + device)
        activeDevices[device] = {ws:ws}
      }

      if (msg.topic === 'dnrhb'){
        activeDevices[msg.device].context = msg.context
        activeDevices[msg.device].lastSeen = Date.now()
      }
    });
  });

  wsServer.on('error', function(err) {
    log.warn( 'dnr comms error: ' + err.toString() );
  });

  lastSentTime = Date.now();

  heartbeatTimer = setInterval(function() {
    var now = Date.now();
    if (now-lastSentTime > WS_KEEP_ALIVE) {
      broadcast("dnrhb",lastSentTime);
    }
  }, WS_KEEP_ALIVE);
}

function stop() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
}

function broadcast(topic,data) {
  lastSentTime = Date.now();
  for (let device in activeDevices){
    publishTo(activeDevices[device].ws, topic, data)
  }
}

function publishTo(ws,topic,data) {
  var msg = JSON.stringify({topic:topic,data:data});
  try {
    ws.send(msg);
  } catch(err) {
    log.warn( 'dnr comms error: ' + err.toString() );
  }
}

module.exports = {
	publish: publish,
  init: init,
  start:start,
  stop:stop
}