var typeRegistry = require("./registry");
var clone = require("clone");
var settings = require('../../../settings.js');
var redUtil = require("../util");
var clone = require("clone");


//redUtil.generateId();
var broker = {
  "birthPayload": "",
  "birthQos": "0",
  "birthRetain": null,
  "birthTopic": "",
  "broker": "localhost",
  "cleansession": true,
  "clientid": "",
  "compatmode": true,
  "credentials": {
      "password": "",
      "user": ""
  },
  "id": "dnr.randomize",
  "keepalive": "15",
  "port": "1883",
  "type": "mqtt-broker",
  "usetls": false,
  "verifyservercert": true,
  "willPayload": "",
  "willQos": "0",
  "willRetain": null,
  "willTopic": "",
  "z": ""
};

var mqttIn = {
  "broker": "dnr.randomize",
  "id": "ec701520.138fe8",
  "name": "",
  "topic": "top1",
  "type": "mqtt in",
  "wires": [],
  "x": 134.5,
  "y": 82,
  "z": ""
};

var mqttOut = {
  "broker": "dnr.randomize",
  "id": "64c198.ff9b3e68",
  "name": "",
  "qos": "",
  "retain": "",
  "topic": "top2",
  "type": "mqtt out",
  "wires": [],
  "x": 331.5,
  "y": 121,
  "z": ""
};

function extractReverseWires(config){
  var reverseWires = {};

  for (var j = 0; j < config.length; j++){
    var c = config[j];

    if (!c.wires)
      continue;

    for (var i = 0; i < c.wires.length; i++){
      if (!reverseWires[c.wires[i]])
        reverseWires[c.wires[i]] = [];

      if (c.id.indexOf('dnr') != -1)
        continue;

      reverseWires[c.wires[i]].push(c.id);
    }
  }

  return reverseWires;
}

function extractForwardWires(config){
  var forwardWires = {};

  for (var j = 0; j < config.length; j++){
    var c = config[j];

    if (!c.wires)
      continue;

    if (!forwardWires[c.id])
      forwardWires[c.id] = [];

    for (var i = 0; i < c.wires.length; i++){
      var outputI = c.wires[i];//will be an array of sub outputs

      var subOutput = [];

      for (var k = 0; k < outputI.length; k++){

        if (outputI[k].indexOf('dnr') != -1)
          continue;

        subOutput.push(outputI[k]);
      }

      forwardWires[c.id].push(subOutput);
    }    
  }

  return forwardWires;
}

function parseConfig(config){
  // var config = clone(config);
  config.push(clone(broker));

  var newMqtts = [];

  for (var j = 0; j < config.length; j++){
    var c = config[j];

    if (!c.hasOwnProperty('constraints') || c.constraints.length === 0)
      continue;

    var cInputs = extractReverseWires(config)[c.id] || [];
    var cOutputs = extractForwardWires(config)[c.id] || [];

    console.log('DEBUG: cOutputs \n' + JSON.stringify(cOutputs));

    // return config;

    for (var i = 0; i < cInputs.length; i++){
      var newMqttIn = clone(mqttIn);
      newMqttIn.id = 'dnr.' + redUtil.generateId();
      newMqttIn.x = c.x - 20;
      newMqttIn.y = c.y - 20;
      newMqttIn.z = c.z;
      newMqttIn.topic = cInputs[i] + '-' + c.id;

      newMqttIn.wires.push(c.id);
      newMqtts.push(newMqttIn);
    }

    for (var i = 0; i < cOutputs.length; i++){
      var outputI = cOutputs[i];

      for (var k = 0; k < outputI.length; k++){
        var newMqttOut = clone(mqttOut);
        newMqttOut.id = 'dnr.' + redUtil.generateId();
        newMqttOut.x = c.x + 20;
        newMqttOut.y = c.y + 20;
        newMqttOut.z = c.z;
        newMqttOut.topic = c.id + '-' + i + '-' + outputI[k];
        
        c.wires[i].push(newMqttOut.id);
        newMqtts.push(newMqttOut);
      }
    }
  }

  for (var i = 0; i < newMqtts.length; i++){
    config.push(newMqtts[i]);
  }

  return config;
}

function process(nodeConfig){
	var constraints = nodeConfig.constraints;
  // TODO: even constraints are satisfied, the node might still want to listen for message from other devices
  // as well as might also want to send message to other devices
  
	if (satisfyConstraints(constraints))
		return nodeConfig;

	// TODO: node cannot run here, replace it with a wire in/out node!
	var nt = typeRegistry.get('dnr');
  if (!nt) 
  	return null;

	var nn;
  var conf = clone(nodeConfig);
  delete conf.credentials;
  for (var p in conf) {
      if (conf.hasOwnProperty(p)) {
          mapEnvVarProperties(conf,p);
      }
  }
  try {
      nn = new nt(conf);
  }
  catch (err) {
      Log.log({
          level: Log.ERROR,
          id:conf.id,
          type: type,
          msg: err
      });
  }

	return nn;
}

function satisfyConstraints(constraints){
	// TODO: implement this logic!
  for (c in constraints){
    if (!constraints.hasOwnProperty(c))
      continue;

    c = constraints[c];

  	if (c.deviceId){
  		if (c.deviceId === settings.deviceId)
  			return true;
  	}
    
  }
	return false;
}

// copied and pasted from Flow.js! this block should be refractored into util? 
var EnvVarPropertyRE = /^\$\((\S+)\)$/;

function mapEnvVarProperties(obj,prop) {
    if (Buffer.isBuffer(obj[prop])) {
        return;
    } else if (Array.isArray(obj[prop])) {
        for (var i=0;i<obj[prop].length;i++) {
            mapEnvVarProperties(obj[prop],i);
        }
    } else if (typeof obj[prop] === 'string') {
        var m;
        if ( (m = EnvVarPropertyRE.exec(obj[prop])) !== null) {
            if (process.env.hasOwnProperty(m[1])) {
                obj[prop] = process.env[m[1]];
            }
        }
    } else {
        for (var p in obj[prop]) {
            if (obj[prop].hasOwnProperty) {
                mapEnvVarProperties(obj[prop],p);
            }
        }
    }
}
// end copied and pasted

module.exports = {
	process: process,
  parseConfig: parseConfig
}