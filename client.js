var http = require('http');
var util = require('util');

doRequest(20);

function doRequest(n) {
	var startTime = new Date();
	var req = http.get("http://localhost:3000/client?time="+ Math.floor(Math.random() * 10 + 5), function(res) {
		res.on('data', function(data) {
			var endTime = new Date();
			util.puts(data);
			if(n > 0)
				doRequest(n - 1);
		});
	});
}
