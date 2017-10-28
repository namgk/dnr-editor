var should = require("should");
var fs = require("fs");
var dnr = require("../../red/runtime/dnr")
var mqtt = require('mqtt')
var topic = 'oaiwjefo;ajw;efj209jf'
var msg = 'j29f0j2j3fqj40f'

describe("dnr mqtt", function() {
  it('connects to external mqtt server', function(done) {
		var client  = mqtt.connect('mqtt://test.mosquitto.org')

		client.on('connect', function () {
		  client.subscribe(topic)
		  client.publish(topic, msg)
		})

		client.on('message', function (t, m) {
		  if (t === topic && m.toString() === msg){
			  client.end()
			  done()
		  }
		})
  });

	it('connects to built in mosca mqtt server', function(done) {
		var http     = require('http')
		  , httpServ = http.createServer()
		  , mosca    = require('mosca')
		  , mqttServer = require('../../red/runtime/mqttServer')
		  , mqttWsPath = '/mqttws'
		  , mqttHost = 'ws://localhost'
		  , port = 37541

		mqttServer.start(httpServ, mqttWsPath)

		httpServ.listen(port, ()=>{
			var client  = mqtt.connect(mqttHost + ':' + port + mqttWsPath)

			client.on('connect', function () {
			  client.subscribe(topic)
			  client.publish(topic, msg)
			})

			client.on('message', function (t, m) {
			  if (t === topic && m.toString() === msg){
				  client.end()
				  done()
			  }
			})
		})
  });
});






