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

function publish(){
  if (!connected)
    setTimeout(publish, 2000);
  else
    client.publish('dnr-new-flows', (settings.https ? 'https' : 'http') + '://' + settings.uiHost + ':' + settings.uiPort + '/flows');
}

module.exports = {
	publish: publish
}