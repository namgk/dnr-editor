var mosca = require('mosca')

function start(httpServer, path){
	var mqttServ = mosca.Server({interfaces:[]})
	mqttServ.attachHttpServer(httpServer, path)
}

module.exports = {
	start: start
}


