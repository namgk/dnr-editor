var mosca = require('mosca')

function start(httpServer, path){
	var mqttServ = mosca.Server({interfaces:[]})
	mqttServ.attachHttpServer(httpServer, path)
	mqttServ.on('published', (d)=>{})
}

module.exports = {
	start: start
}


