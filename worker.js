var http = require('http');
var util = require('util');
var config = require('./worker_config.js');
var timer = require('timers');

var idle = true;
var workerID = -1;
register();


function register() {
	config.sheduler.path = '/register';
	util.puts("register with sheduler");
	var req = http.request(config.sheduler, function(res) {
		var data = "";
		res.on('data', function(chunk) {
			data = data + chunk;
		})
		res.on('end', function() {
			workerID = JSON.parse(data);
			util.puts("Got workerID: " + workerID);
			config.sheduler.path = '/worker';
			var req = http.request(config.sheduler, function(res) {
				var data = "";
				res.on('data', function(chunk) {
					data = data + chunk;
				});
				res.on('end', function() {
					if(res.statusCode == 200) {
						computeEvenNumber(JSON.parse(data));
					}
					else {
						idle = true;
					}
				});
			});
			var answer = {
				id : workerID,
				idle : true
			}
			util.puts(JSON.stringify(answer));
			req.end(JSON.stringify(answer));
		});
	});
	req.end(JSON.stringify({
		opts : config.opts,
		vmname : config.vmname,
		idle : true
	}));
}

var srv = http.createServer(function(req, res) {
	var data = "";
	req.on('data', function(chunk) {
		data = data + chunk;
	});
	req.on('end', function() {
		res.writeHead(200);
		res.end();
		computeEvenNumber(JSON.parse(data));
	});
});
srv.listen(config.opts.port);

function computeEvenNumber(job) {
	idle = false;
	util.puts("new Job:");
	util.puts(JSON.stringify(job));
	timer.setTimeout(function(id) {
		config.sheduler.path = '/worker';
		var req = http.request(config.sheduler, function(res) {
			var data = "";
			res.on('data', function(chunk) {
				data = data + chunk;
			});
			res.on('end', function() {
				if(res.statusCode == 200) {
					computeEvenNumber(JSON.parse(data));
				}
				else {
					idle = true;
				}
			});
		});
		var num = Math.floor(Math.random() * 256);
		if(num % 2 != 0)
			num = -1;
		var answer = {
			result : {
				id : id,
				num : num,
				param : job.param
			},
			id : workerID,
			idle : true
						
		}
		util.puts(JSON.stringify(answer));
		req.end(JSON.stringify(answer));
	}, job.param * 300, job.id);
};
