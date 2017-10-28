var should = require("should");
var fs = require("fs");
var dnr = require("../../red/runtime/dnr")

describe("dnr", function() {
  it('extracts node types', function() {
  	var testCases = [
  		{
  			dir: 'io',
  			allNodeTypes: [ 'tls-config',
				  'mqtt-broker',
				  'mqtt in',
				  'mqtt out',
				  'http in',
				  'http response',
				  'http request',
				  'websocket-listener',
				  'websocket-client',
				  'websocket in',
				  'websocket out',
				  'watch',
				  'tcp in',
				  'tcp out',
				  'tcp request',
				  'udp in',
				  'udp out' 
				]
  		},
  		{
  			dir: 'core',
  			allNodeTypes: [ 'inject',
				  'catch',
				  'status',
				  'debug',
				  'link in',
				  'link out',
				  'exec',
				  'function',
				  'template',
				  'delay',
				  'trigger',
				  'comment',
				  'unknown' 
				]
  		}
  	]
  	for (var test of testCases){
  		var dir = test.dir
  		var expected = test.allNodeTypes

  		var builtInNodes = fs.readdirSync('nodes/core/' + dir)
	  	var allNodeTypes = []
	  	for (var nodeFile of builtInNodes){
	  		if (!nodeFile.endsWith('.js')){
	  			continue
	  		}
	  		var nodeFileStr = fs.readFileSync('nodes/core/'+dir+'/'+nodeFile, 'utf8')
	  		allNodeTypes = allNodeTypes.concat(dnr.extractNodeTypes(nodeFileStr))
	  	}
			allNodeTypes.should.eql(expected)
  	}
  });

	it('extracts node types - nasty cases', function() {
		var nodeFileStr = fs.readFileSync('test/dnr/sampleNode.js', 'utf8')
		var expected = [ 'rpi-gpio in',
		  'rpi-gpio in 2',
		  ' rpi-gpio in 3',
		  ' rpi-gpio in 4',
		  ' rpi-gpio in 5',
		  ' rpi-gpio in 6',
		  ' rpi-gpio in 7',
		  ' rpi-gpio in 8',
		  ' rpi-gpio in 9',
		  'rpi-gpio out',
		  'rpi-mouse',
		  'rpi-keyboard' 
		]

		var nodeTypes = dnr.extractNodeTypes(nodeFileStr)
		nodeTypes.should.eql(expected)
  });
});






