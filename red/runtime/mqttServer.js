var mosca = require('mosca')

function start(httpServer, path){
	var mqttServ = mosca.Server()
	mqttServ.attachHttpServer(httpServer, path)
}

module.exports = {
	start: start
}


