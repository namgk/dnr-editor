// var mqtt = require('mqtt');
// var client = mqtt.connect('mqtt://localhost:1883');
// var settings = require('./settings.js');
var connected = false;

var ws = require("ws");
var activeConnections = [];
var wsServer;

var server;
var settings;

var heartbeatTimer;
var lastSentTime;

var webSocketKeepAliveTime = 15000;


// client.on('connect', function () {
//   connected = true;
//   client.subscribe('dnr-new-flows');
// });

// client.on('message', function (topic, message) {
//   console.log('DEBUG new flows available at: ' + message.toString());
// });

function publish(config, diff, flows){
  // publishWs('deployment', config)

  // if (!diff || !diff.changed){
  //   return;
  // }

  // var tobePublished = [];

  // console.log('----------------');
  
  // if (config.subflows){
  //   console.log(JSON.stringify(config.subflows));
  //   console.log('----------------');
  //   Object.keys(config.subflows).forEach(function(key) {
  //     var subflow = config.subflows[key];
  //     tobePublished.push(subflow);
  //   });
  // }

  // for (var i = 0; i < diff.changed.length; i++){
  //   var id = diff.changed[i];
  //   var changedFlow = flows.getFlow(id);
  //   if (!changedFlow){
  //     continue;
  //   }

  //   tobePublished.push(changedFlow);
  //   console.log(JSON.stringify(changedFlow));
  //   console.log('----------------');
  // }

  // console.log(JSON.stringify(tobePublished));
  // client.publish('dnr-new-flows', (settings.https ? 'https' : 'http') + '://' + settings.uiHost + ':' + settings.uiPort + '/flows');
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

  start()

  _runtime.adminApi.adminApp.post("/dnr/flows/:id", require("../api").auth.needsPermission("flows.read"), function(req,res) {
    var deployingFlow = req.params.id;
    publishWs('flow_deployed', {
      activeFlow: _runtime.nodes.getFlow(deployingFlow),
      allFlows: _runtime.nodes.getFlows().flows.filter(function(e){
        return e.type === 'tab'
      }).map(function(ee){
        return ee.id
      })
    })
    res.sendStatus(200);
  });
}

function start(){
  wsServer.on('connection',function(ws) {
    activeConnections.push(ws);

    ws.on('close',function() {
      removeActiveConnection(ws);
    });

    ws.on('message', function(data,flags) {
      var msg = null;
      try {
        msg = JSON.parse(data);
      } catch(err) {
        log.warn( 'dnr comms error: ' + err.toString() );
        return;
      }

      try {
        activeConnections.push(ws);
        ws.send(JSON.stringify({conn:"ok"}));
      } catch(err) {
          // Just in case the socket closes before we attempt
          // to send anything.
      }
    });

    ws.on('error', function(err) {
      log.warn( 'dnr comms error: ' + err.toString() );
    });
  });

  wsServer.on('error', function(err) {
    log.warn( 'dnr comms error: ' + err.toString() );
  });

  lastSentTime = Date.now();

  heartbeatTimer = setInterval(function() {
    var now = Date.now();
    if (now-lastSentTime > webSocketKeepAliveTime) {
      publishWs("dnrhb",lastSentTime);
    }
  }, webSocketKeepAliveTime);
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

function publishWs(topic,data) {
  if (server) {
    lastSentTime = Date.now();
    activeConnections.forEach(function(conn) {
        publishTo(conn,topic,data);
    });
  }
}

function publishTo(ws,topic,data) {
  var msg = JSON.stringify({topic:topic,data:data});
  try {
    ws.send(msg);
  } catch(err) {
    removeActiveConnection(ws);
    log.warn( 'dnr comms error: ' + err.toString() );
  }
}

function removeActiveConnection(ws) {
    for (var i=0;i<activeConnections.length;i++) {
        if (activeConnections[i] === ws) {
            activeConnections.splice(i,1);
            break;
        }
    }
}

module.exports = {
	publish: publish,
  init: init,
  start:start,
  stop:stop
}