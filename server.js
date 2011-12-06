var CONFIG = require('./config');
var WebSocketServer = require('websocket').server;
var fs = require('fs');
var params = ["cpu", "sys"];

function get_date(file) {
    var regrep = "dstat_log\.([0-9]{4})([0-9]{2})([0-9]{2})\\..*"
    var re = new RegExp(regrep);
    if (!file.match(re)) {
        return null;
    }
    var date = new Date(parseInt(RegExp.$1), parseInt(RegExp.$2) - 1, parseInt(RegExp.$3));
    return date
}

function get_latest(path) {
    var files = fs.readdirSync(path);
    var max = files[0];
    for ( var i=1; i < files.length; i++) {
        var date = get_date(files[i]);
        if ( date && date > get_date(max) ){
            max = files[i];
        }
    }
    return max;
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
    var connection = request.accept(null, null);
    var log_dir = CONFIG.LOGDIR;
    var log_file = log_dir + "/" + get_latest(log_dir);

    var pos = fs.statSync(log_file).size;

    var mongoTail = require('child_process').spawn("mongo-tail", ["-f", "-c", "dstat"]);
    mongoTail.stdout.on('data', function (data) {
	    try {
		var sendData = {};
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
		console.log("---");
		console.log(sendData);
		connection.sendUTF(JSON.stringify(sendData));
	    } catch(e) {
		console.log(e.message);
	    }
	});

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);
            connection.sendUTF(message.utf8Data.toUpperCase());
            params = message.utf8Data.split(".");
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

