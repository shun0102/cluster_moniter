var CONFIG = require('./config');
var WebSocketServer = require('websocket').server;
var fs = require('fs');
var params = ["cpu", "sys"];
var Dstat = require('./schema');
var connection;

function sendDstat(err, docs) {
    console.log(docs[0]);
    docs[0].type = 'dstat';
    connection.sendUTF(JSON.stringify(docs[0]));    
}

var http = require('http').createServer (
    function(request, response) {
        response.end();
    }
);

http.listen(
    CONFIG.PORT, function() {
        console.log('listen:' + CONFIG.PORT);
    }
);

ws = new WebSocketServer({
    'httpServer' : http,
    autoAcceptConnections: false
});

ws.on('request', function(request) {
    console.log('request.');
    console.log(request.origin);
    console.log(request.requestedProtocols);
    connection = request.accept(null, null);

    var mongoTail = require('child_process').spawn("mongo-tail", ["-f", "-c", "dstats"]);
    mongoTail.stdout.on('data', function (data) {
	    try {
		var sendData = {'type':'graph'};
		var dataStr = data.toString();
		dataStr.replace(/([^\n]+)\n/g, function(m, line) {
			//console.log(line);
			var obj = JSON.parse(line);
			var hash = {};
			for (var j in obj.dstat) {
			    if (j.match("^" + params[0])) {
				hash[j] = obj.dstat[j][params[1]];
			    }
			}
			sendData[obj.hostname] = hash;
		    });
		//console.log("---");
		//console.log(sendData);
		connection.sendUTF(JSON.stringify(sendData));
	    } catch(e) {
		console.log(e.message);
	    }
	});

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);
	    var data = JSON.parse(message.utf8Data);

	    switch (data.type) {
	    case "parameter":
		//connection.sendUTF(data);
		params = data.msg.split(".");
		break;
	    case "dstat":
		Dstat.where('hostname', data.msg).limit(1).desc('time').run(sendDstat);
		break;
	    }

        }
        else if (message.type === 'binary') {
            console.log("Received Binary Message of " + message.binaryData.length + " bytes");
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(connection) {
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
});

ws.on('connect', function(con) {
    console.log('connect.');
});

