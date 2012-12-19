var http = require('http');
var util = require('util');


var local = true;
var reqUrl = "http://localhost:3000/client?time=";

if(!local)
	reqUrl = "http://bastinat0r.de:3000/client?time=";

doRequest(20);
doRequest(20);

function doRequest(n) {
	var startTime = new Date();
	var req = http.get(reqUrl + Math.floor(Math.random() * 10 + 5), function(res) {
		res.on('data', function(data) {
			var endTime = new Date();
			util.puts((endTime.getTime() - startTime.getTime()) / 1000.0);
			if(n > 0)
				doRequest(n - 1);
		});
	});
}
