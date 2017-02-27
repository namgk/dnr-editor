"use strict"

var log = require("./log")
var ws = require("ws")
var util = require("./util")
var mosca = require('mosca')

var connected = false
var activeDevices = {} // deviceId --> ws, context, lastSeen, contributingNodes
var activeBrokers = []
var wsServer

var server
var runtime

var heartbeatTimer
var lastSentTime

var WS_KEEP_ALIVE = 15000
var DEVICE_INACTIVE = 5000*3

var dnrInterface = require('dnr-interface')
var DnrSyncReq = dnrInterface.DnrSyncReq
var DnrSyncRes = dnrInterface.DnrSyncRes

var TOPIC_DNR_HB = dnrInterface.TOPIC_DNR_HB
var TOPIC_REGISTER = dnrInterface.TOPIC_REGISTER
var TOPIC_REGISTER_ACK = dnrInterface.TOPIC_REGISTER_ACK
var TOPIC_REGISTER_REQ = 'register_req'
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
    perMessageDeflate: false
  });

  var mqttServ = mosca.Server({})
  mqttServ.attachHttpServer(server)

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
    [list of brokers]
*/
function assignBrokers(dnrSyncReq){
  let deviceId = dnrSyncReq.deviceId
  let flowId = dnrSyncReq.flowId

  let device = activeDevices[deviceId]
  let deviceContext = device.context
  if (!deviceContext || !deviceContext.location || Object.keys(deviceContext.location) !== 2){
    return [] // me as default?
  }

  // TODO: assign brokers intelligently
  return []
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
      <link> : <topic>
    }
*/
function processDnrSyncRequest(dnrSyncReq){
  let deviceId = dnrSyncReq.deviceId
  let flowId = dnrSyncReq.flowId
  let flow = runtime.nodes.getFlow(flowId)
  if (!flow){
    return {}
  }

  let dnrLinks = dnrSyncReq.dnrLinks
  let contributingNodes = dnrSyncReq.contributingNodes
  
  activeDevices[deviceId].contributingNodes = contributingNodes
  var dnrLinksResponse = {}

  for (let dnrLink of dnrLinks){
    let link = dnrLink.split('-')[0]
    let linkState = parseInt(dnrLink.split('-')[1])
    let linkType
    
    let sourceId = link.split('_')[0]
    let sourcePort = link.split('_')[1]
    let destId = link.split('_')[2]

    for (let node of flow.nodes){
      if (node.id !== sourceId){
        continue
      }

      if (!node.constraints || !node.constraints.link){
        log.warn('device asking for a dnr link that is NN - ' + dnrLink)
        linkType = 'NN'
      } else {
        linkType = node.constraints.link[sourcePort + '_' + destId]
      }

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
    if (!device.context || !device.context.freeMem || !device.contributingNodes){
      continue
    }

    let freeMem = device.context.freeMem
    
    let contribNodes = device.contributingNodes
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
      log.info('ws connection closed - ' + device)
      unregisterDevice(device, true)
    });

    ws.on('error', function(err) {
      log.warn( 'dnr comms error: ' + err.toString() );
      unregisterDevice(device)
    });

    ws.on('message', function(data,flags) {
      console.log(data)
      if (ws.readyState != 1){
        return
      }

      try {
        var msg = JSON.parse(data);
      } catch(err) {
        log.warn( 'dnr comms error: ' + err.toString() );
        return;
      }

      if (msg.topic === TOPIC_REGISTER){
        device = getUniqueId()
        registerDevice(device, ws, msg)
        ws.send(JSON.stringify({
          'topic': TOPIC_REGISTER_ACK,
          'id': device
        }))
      }

      if (msg.topic === TOPIC_DNR_HB){
        device = msg.deviceId
        // request for reregistering this device
        if (!activeDevices[device]){
          ws.send(JSON.stringify({
            'topic': TOPIC_REGISTER_REQ
          }))
          return
        }

        updateDevice(device, msg.context)

        // processing any coordination requests
        let dnrSyncReqs = msg.dnrSyncReqs
        if (!dnrSyncReqs || Object.keys(dnrSyncReqs).length === 0){
          return
        }

        let resp = []
        for (let k in dnrSyncReqs){
          let dnrSyncReq = dnrSyncReqs[k]
          if (!dnrSyncReq.deviceId || dnrSyncReq.deviceId !== device){
            log.warn('id in dnrSyncReq not match with heartbeat request - ' + dnrSyncReq.deviceId + ' vs ' + device)
            continue
          }
          let dnrLinksRes = processDnrSyncRequest(dnrSyncReq)
          let dnrBrokers = assignBrokers(dnrSyncReq)
          resp.push({
            'dnrSyncReq': dnrSyncReq,
            'dnrSyncRes': new DnrSyncRes(dnrLinksRes, dnrBrokers)
          })
        }
        ws.send(JSON.stringify({
          'topic': TOPIC_DNR_SYN_RESS,
          'dnrSync' : resp
        }))
      }
    })
  })

  wsServer.on('error', function(err) {
    log.warn( 'dnr comms error: ' + err.toString() )
  })

  lastSentTime = Date.now()

  heartbeatTimer = setInterval(function() {
    var now = Date.now();
    if (now-lastSentTime > WS_KEEP_ALIVE) {
      broadcast(TOPIC_DNR_HB,lastSentTime)
    }
    for (let dId in activeDevices){
      if (now - activeDevices[dId].lastSeen > DEVICE_INACTIVE){
        unregisterDevice(dId)
      }
    }
  }, WS_KEEP_ALIVE)
}

function updateDevice(d, context){
  if (!activeDevices[d]){
    log.warn('bug alert! - updating a device that is not there')
    return
  }
  activeDevices[d].context = context
  activeDevices[d].lastSeen = Date.now()
  runtime.adminApi.comms.publish('devices/heartbeat', {
    id: d,
    lastSeen: Date.now(),
    context: context
  }, false)
}

function registerDevice(d, ws, msg){
  if (activeDevices[d]){
    log.warn('bug alert! - registering a device that is already there')
    return   
  }
  log.info('new device connected - ' + d)
  activeDevices[d] = {ws: ws, lastSeen: Date.now(), name: msg.deviceName}
  runtime.adminApi.comms.publish('devices/connected', {id: d, name: msg.deviceName}, false)
}

function unregisterDevice(d, closed){
  if (!activeDevices[d]){
    return
  }
  log.info('device disconnected - ' + d)

  if (!closed){
    activeDevices[d].ws.close()
  }

  delete activeDevices[d]
  runtime.adminApi.comms.publish('devices/disconnected', {id: d}, false)
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