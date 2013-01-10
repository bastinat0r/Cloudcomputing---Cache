var http = require('http');
var util = require('util');
var config = require('./worker_config.js');
var timer = require('timers');
var exec = require('child_process').exec;

var idle = true;
var workerID = -1;
register();

var avg_interval = [];


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
			setInterval(reportLoad, 10000);
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
	causeLoad(function(id, result) {
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
		var num = Math.floor(result);
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

function causeLoad(cb, param, cbParam) {
	var sum = 0;
	for(var i = 0; i < param * 10000; i++) {
		sum += Math.sqrt(Math.abs(Math.log(Math.random()) * Math.log(Math.random())));
	}
	cb(cbParam, sum);
}

function cpuLoad(cb) {
	exec("ps -o pcpu h --pid " + process.pid, function(err, stdout, stderr) {
		if(err)
			util.puts(err);
		var load = JSON.parse(stdout);
		
		if(false) {
			if(avg_interval.length > 5) {
				avg_interval.shift();
			}
			avg_interval.push(load);
			var sum = 0;
			for(var i in avg_interval) {
				sum += avg_interval[i];
			}
			load = sum / avg_interval.length;
		}
		
		cb(load);
	});
}

function reportLoad() {
	cpuLoad(function(load) {
		config.sheduler.path = '/load';
		var req = http.request(config.sheduler, function(res) {
		});
		var answer = {
			load : load,
			id : workerID,
		}
		req.end(JSON.stringify(answer));
	});
}
