var http = require('http');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var events = require('events');
var exec = require('child_process').exec;
resultEmitter = new events.EventEmitter();

var port = 3000;
var cache = {};
var workers = [];
var idCount = 0;

var queue = [];
var load = 0;
var stopNextWorker = false;

var azure_vm_names = ['foobar'];
var autoscale_method = 'load'; /* can be set to load, or queue, or something else */
var debug = false;

var cacheing = false;
var negativeCaching = false;
var prefill = false;


if(prefill) {
	for(var i = 0; i<15; i++) {
		enqueJob({
			param : i,
			id : i
		});
	};
	idCount = i+1;
}

var srv = http.createServer(function(req, res) {
	var data = "";
	req.on('data', function(chunk) {
		data = data + chunk;
	});
	req.on('end', function() {
		if(debug) {
			util.puts(data);
			util.puts(req.url);
		}
		if(/^\/worker/.test(req.url)) {
			if(req.method == 'POST') {
				var worker = JSON.parse(data);
				if(worker.result) {
					util.puts("Worker submitted result: "+ worker.id);
					util.puts(JSON.stringify(worker.result));
					resultEmitter.emit('result'+worker.result.id, worker.result);
					if(cacheing && (worker.result.num >= 0 || negativeCaching)) {
						cache[worker.result.param] = worker.result.num;
					}
				}
				if(stopNextWorker && workers[worker.id].vmname) {
					workers[worker.id].idle = false;
					workers[worker.id].terminated = true;
					stopWorker(workers[worker.id].vmname);
				} else {
					if(queue.length == 0) {
						workers[worker.id].idle = true;
						res.writeHead(404);
						res.end();
					} else {
						workers[worker.id].idle = false;
						res.writeHead(200);
						res.end(JSON.stringify(queue.shift()));
					}
				}
			}
		}
		if(/^\/register/.test(req.url)) {
			worker = JSON.parse(data);
			workers.push(worker);
			util.puts("worker registered: " + (workers.length - 1));
			res.writeHead(200);
			res.end(JSON.stringify(workers.length - 1));
		}
		
		if(/^\/load/.test(req.url)) {
			worker = JSON.parse(data);
			workers[worker.id].load = worker.load;
			var sum = 0;
			var num = 0;
			for(var i in workers) {
				if(!workers[i].terminated) {
					if(workers[i].load) {
						sum += workers[i].load;
						num++;
					}
				}
			}
			if(num == 0) {
				load = 0;
			} else {
				load = sum / num;
			}
			util.puts("load " + worker.id + " :\t" + worker.load);
			util.puts("avg     :\t" + load);

			if(autoscale_method == 'load') {
				if(load > 50 && azure_vm_names.length > 0) {
					stopNextWorker = false;
					startWorker(azure_vm_names.pop());
				}
				if(load < 45) { 
					stopNextWorker = true;
				}
			}

			res.writeHead(200);
			res.end(JSON.stringify(load));
		}
		
		if(/^\/client/.test(req.url)) {
			var reqUrl = url.parse(req.url);
			var param = querystring.parse(reqUrl.query);
			var job = {
				param : param.time,
				id : idCount
			};
			if(cacheing && cache[param.time]) {
				var answer = {
					num : cache[param.time],
					param : param.time,
					id : -1
				}
				res.writeHead(200);
				res.end(JSON.stringify(answer));
			} else {
				idCount++;
				enqueJob(job);
				res.writeHead(200);
				resultEmitter.on('result'+job.id, function(result) {
					res.end(JSON.stringify(result));
				});
			}
		}
	});
});
srv.listen(port);

function enqueJob(job) {
	for(var i in workers) {
		if(workers[i].idle) {
			workers[i].idle = false;
			startJob(workers[i], job);
			return;
		}
	}
	queue.push(job);
	if(autoscale_method == 'queue') {
		if(queue.length > 5 && azure_vm_names.length > 0) {
			stopNextWorker = false;
			startWorker(azure_vm_names.pop());
		}
		if(queue.length <3) {
			stopNextWorker = true;
		}
	}
};

function startJob(worker, job) {
	var req = http.request(worker.opts, function(res) {
	});
	req.end(JSON.stringify(job));
}

function execCB(err, stdout, stderr) {
		if(err) {
			util.puts("Err: " + JSON.stringify(err));
		}
		util.puts(stdout);
		util.puts(stderr);
}

function startWorker(vmname) {
	util.puts("Starting Worker: " + vmname);
	var child = exec("azure vm start " + vmname, execCB);
}

function stopWorker(vmname) {
	var stopNextWorker = false;
	azure_vm_names.push(vmname);
	util.puts("stopping worker");
	var child = exec("azure vm shutdown " + vmname, execCB);
}
