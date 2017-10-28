var should = require("should");
var fs = require("fs");
var dnr = require("../../red/runtime/dnr")
var mqtt = require('mqtt')
var topic = 'oaiwjefo;ajw;efj209jf'
var msg = 'j29f0j2j3fqj40f'

describe("dnr mqtt", function() {
  it('connect to external mqtt server', function(done) {
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

	it('connect to built in mosca mqtt server', function(done) {
		var http     = require('http')
		  , httpServ = http.createServer()
		  , mosca    = require('mosca')
		  , mqttServ = new mosca.Server({})
		  , mqttWsPath = '/mqttws'

		mqttServ.attachHttpServer(httpServ, mqttWsPath)

		httpServ.listen(3000, ()=>{
			var client  = mqtt.connect('ws://localhost:3000' + mqttWsPath)

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






