var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://test.mosquitto.org');
var settings = require('../../../settings.js');

var connected = false;

client.on('connect', function () {
  connected = true;
  client.subscribe('dnr-new-flows');
});

client.on('message', function (topic, message) {
  console.log('DEBUG new flows available at: ' + message.toString());
});

function publish(config, diff, flows){
  if (!connected) {
    setTimeout(publish, 2000);
    return;
  }

  // if (!diff || !diff.changed){
  //   return;
  // }

  // var tobePublished = [];

  // console.log(diff);
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
  client.publish('dnr-new-flows', (settings.https ? 'https' : 'http') + '://' + settings.uiHost + ':' + settings.uiPort + '/flows');
}

module.exports = {
	publish: publish
}