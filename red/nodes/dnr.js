var typeRegistry = require("./registry");
var clone = require("clone");
var settings = require('../../settings.js');

function process(nodeConfig){
	var constraints = nodeConfig.constraints;
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
	if (constraints.deviceId){
		if (constraints.deviceId === settings.deviceId)
			return true;
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
	process: process
}