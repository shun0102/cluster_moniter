var CONFIG = require('./config');
var WebSocketServer = require('websocket').server;
var fs = require('fs');
var param = "cpu";

function get_date(file) {
    var regrep = "iostat_log\.([0-9]{4})([0-9]{2})([0-9]{2})\\..*"
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
    var tail = require('child_process').spawn("tail", ["-f", log_file]);

    tail.stdout.on('data', function (data) {
        var lines = data.toString().split("\n");

        for (var i=0; i<lines.length; i++) {
            var records = lines[i].split("\t");
            if (records[2]) {
                try {
                    var hash = JSON.parse(records[2].toString());
                    var sendData = {'hostname':hash.hostname,
                                   'stats':{}}
                    sendData.stats[param] = hash.stats[param]
                    connection.sendUTF( JSON.stringify(sendData) );
                } catch(e) {
                    console.log('error');
                }
            }
        }
    });

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);
            connection.sendUTF(message.utf8Data.toUpperCase());
            param = message.utf8Data;
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

