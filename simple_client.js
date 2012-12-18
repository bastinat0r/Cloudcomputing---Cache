var http = require('http');
var util = require('util');

doRequest();

function doRequest() {
	var startTime = new Date();
	var req = http.get("http://localhost:3000/client?"+"time=5", function(res) {
		res.on('data', util.puts);
	});
}
