var http = require('http');
var util = require('util');


var local = false;
var reqUrl = "http://localhost:3000/client?time=";

http.globalAgent.maxSockets = 30;

if(!local)
	reqUrl = "http://bastinat0r.de:3000/client?time=";

for(var i = 0; i < 12; i++) {
	doRequest(3);
}
var sum = 0;
var num = 0;

function doRequest(n) {
	var startTime = new Date();
	var req = http.get(reqUrl + Math.floor(Math.random() * 10 + 5), function(res) {
		res.on('data', function(data) {
			var endTime = new Date();
			var time = (endTime.getTime() - startTime.getTime()) / 1000.0
			sum += time;
			num++;
			util.puts("t: " + time + "  \tavg: " + sum / num );
			if(n > 0)
				doRequest(n - 1);
		});
	});
}
