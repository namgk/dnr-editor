"use strict"

var log = require("./log");
var ws = require("ws");
var util = require("./util");

var connected = false;
var activeDevices = {}; // deviceId --> ws, context, lastSeen, contributingNodes
var wsServer;

var server;
var runtime

var heartbeatTimer;
var lastSentTime;

var WS_KEEP_ALIVE = 15000;
var DEVICE_INACTIVE = 30000

var dnrInterface = require('dnr-interface')
var DnrSyncReq = dnrInterface.DnrSyncReq
var DnrSyncRes = dnrInterface.DnrSyncRes

var TOPIC_DNR_HB = dnrInterface.TOPIC_DNR_HB
var TOPIC_REGISTER = dnrInterface.TOPIC_REGISTER
var TOPIC_REGISTER_ACK = dnrInterface.TOPIC_REGISTER_ACK
var TOPIC_DNR_SYN_REQ = dnrInterface.TOPIC_DNR_SYN_REQ
var TOPIC_DNR_SYN_RES = dnrInterface.TOPIC_DNR_SYN_RES
var TOPIC_DNR_SYN_RESS = dnrInterface.TOPIC_DNR_SYN_RESS
var TOPIC_FLOW_DEPLOYED = dnrInterface.TOPIC_FLOW_DEPLOYED

// hooked from flow deployment 
function publish(config, diff, flows){
  // TODO: process diff
}

function init(_server,_runtime) {
  server = _server
  runtime = _runtime

  var path = _runtime.settings.httpAdminRoot || "/";
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
    broadcast(TOPIC_FLOW_DEPLOYED, {
      activeFlow: _runtime.nodes.getFlow(deployingFlow),
      globalFlow: _runtime.nodes.getFlow('global'),
      allFlows: _runtime.nodes.getFlows().flows.filter(function(e){
        return e.type === 'tab'
      }).map(function(ee){
        return ee.id
      })
    })
    res.sendStatus(200)
  })

  _runtime.adminApi.adminApp.get("/dnr/devices", require("../api").auth.needsPermission("flows.read"), function(req,res) {
    let activeDevicesTemp = []
    for (let x in activeDevices){
      activeDevicesTemp.push({
        id: x,
        context: activeDevices[x].context,
        lastSeen: activeDevices[x].lastSeen
      })
    }

    res.json(activeDevicesTemp)
  })

  start()
}

/* 
  @param dnrSyncReq: 
    { 
      deviceId: '1',
      flowId: 'xxx',
      dnrLinks: [ 
        '54236bf5.2703a4_0_1d58c765.938219-<linkState>',
        '1d58c765.938219_0_6cd77d5e.6c54b4-<linkState>' 
      ],
      contributingNodes: ["54236bf5.2703a4"]
    }

  @return:
    {
      dnrLinks: {
        <link> : <topic>
      },
      brokers: []
    }
*/
function processDnrSyncRequest(dnrSyncReq){
  let deviceId = dnrSyncReq.deviceId
  let flowId = dnrSyncReq.flowId
  let dnrLinks = dnrSyncReq.dnrLinks
  let contributingNodes = dnrSyncReq.contributingNodes

  activeDevices[deviceId].contributingNodes = contributingNodes

  var dnrLinksResponse = {}

  for (let dnrLink of dnrLinks){
    let link = dnrLink.split('-')[0]
    let linkState = dnrLink.split('-')[1]
    let linkType
    
    let sourceId = link.split('_')[0]
    let sourcePort = link.split('_')[1]
    let destId = link.split('_')[2]

    // based on this flow
    let flow = runtime.nodes.getFlow(flowId)
    for (let node of flow.nodes){
      if (node.id !== sourceId){
        continue
      }

      linkType = node.constraints.link[sourcePort + '_' + destId]
    }

    let commTopic
    if (linkState === dnrInterface.Context.FETCH_FORWARD){
      // find one device that host srcId
      let mostFreeDevId = findDeviceForNode(sourceId)   
           
      if (!mostFreeDevId){
        continue
      }

      // subcribing topic will be
      switch (linkType){
        case '11':
          // "from_<deviceId>_to_deviceId_<srcId>_<srcPort>_<destId>"
          commTopic = "from_" + mostFreeDevId + 
                      "_to_" + deviceId + "_" + link
          break
        case '1N':
          // "from_<deviceId>_<srcId>_<srcPort>_<destId>"
          commTopic = "from_" + mostFreeDevId + "_" + link
          break
        default:
          break
      }

    } else if (linkState === dnrInterface.Context.RECEIVE_REDIRECT){
      // find one device that host destId
      let mostFreeDevId = findDeviceForNode(destId)   
           
      if (!mostFreeDevId){
        continue
      }

      // publishing topic will be
      switch (linkType){
        case '11':
          // "from_deviceId_to_<deviceId>_<srcId>_<srcPort>_<destId>"
          commTopic = "from_" + deviceId + 
                      "_to_" + mostFreeDevId + "_" + link
          break
        case 'N1':
          // "to_<deviceId>_<srcId>_<srcPort>_<destId>"
          commTopic = "to_" + mostFreeDevId + "_" + link
          break
        default:
          break
      }
    }

    if (commTopic){
      dnrLinksResponse[link] = commTopic
    }
  }

  return dnrLinksResponse
}

function findDeviceForNode(nodeId){
  let mostFreeMem = 0
  let mostFreeDevId
  for (let dId in activeDevices){
    let device = activeDevices[dId]
    let freeMem = device.context.freeMem
    
    let contribNodes = activeDevices[dId].contributingNodes
    if (contribNodes.includes(nodeId)){
      if (freeMem > mostFreeMem){
        mostFreeMem = freeMem
        mostFreeDevId = dId
      }
    }
  }
  return mostFreeDevId
}

function getUniqueId(){
  let connId = util.generateId()
  if (activeDevices[connId]){
    return getUniqueId()
  }
  return connId
}

function start(){
  wsServer.on('connection',function(ws) {
    let device = 'annonymous'

    ws.on('close',function() {
      log.info(device + ' disconnected')
      runtime.adminApi.comms.publish('devices/disconnected', {id: device}, false)
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

      if (msg.topic === TOPIC_REGISTER){
        device = msg.device
        
        if (activeDevices[device]){
          device = getUniqueId()
          ws.send(JSON.stringify({
            'topic': TOPIC_REGISTER_ACK, 'idOk': false, 'id': device
          }))
        } else {
          ws.send(JSON.stringify({
            'topic': TOPIC_REGISTER_ACK, 'idOk': true, 'id': device
          }))
        }

        log.info('new device connected - ' + device)
        runtime.adminApi.comms.publish('devices/connected', {id: device}, false)

        activeDevices[device] = {ws:ws}
      }

      if (msg.topic === TOPIC_DNR_HB){
        activeDevices[msg.device].context = msg.context
        activeDevices[msg.device].lastSeen = Date.now()
        runtime.adminApi.comms.publish('devices/heartbeat', {
          id: msg.device,
          lastSeen: Date.now(),
          context: msg.context
        }, false)

        let dnrSyncReqs = msg.dnrSyncReqs
        if (!dnrSyncReqs || Object.keys(dnrSyncReqs).length === 0){
          return
        }

        let resp = []
        for (let k in dnrSyncReqs){
          let dnrSyncReq = dnrSyncReqs[k]
          let dnrLinksRes = processDnrSyncRequest(dnrSyncReq)
          resp.push({
            'dnrSyncReq': dnrSyncReq,
            'dnrSyncRes': new DnrSyncRes(dnrLinksRes)
          })
        }
        ws.send(JSON.stringify({
          'topic': TOPIC_DNR_SYN_RESS,
          'dnrSync' : resp
        }))
      }
    });
  });

  wsServer.on('error', function(err) {
    log.warn( 'dnr comms error: ' + err.toString() );
  });

  lastSentTime = Date.now();

  var test = [
    {
      topic: 'devices/connected',
      data: {
        id: '1'
      }
    },
    {
      topic: 'devices/connected',
      data: {
        id: '2'
      }
    },
    {
      topic: 'devices/disconnected',
      data: {
        id: '2'
      }
    },
    {
      topic: 'devices/heartbeat',
      data: {
        id: '1',
        lastSeen: Date.now(),
        context: {
          freeMem: 512
        }
      }
    },
    {
      topic: 'devices/heartbeat',
      data: {
        id: '1',
        lastSeen: Date.now(),
        context: {
          freeMem: 111
        }
      }
    },
    {
      topic: 'devices/disconnected',
      data: {
        id: '1'
      }
    }
  ]

  var testIdx = 0

  heartbeatTimer = setInterval(function() {
    // runtime.adminApi.comms.publish(test[testIdx % test.length].topic, test[testIdx % test.length].data, false)
    // testIdx++


    var now = Date.now();
    if (now-lastSentTime > WS_KEEP_ALIVE) {
      broadcast(TOPIC_DNR_HB,lastSentTime);
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