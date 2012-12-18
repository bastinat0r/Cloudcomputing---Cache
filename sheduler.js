var http = require('http');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var events = require('events');
resultEmitter = new events.EventEmitter();

var port = 3000;
var cache = {};
var workers = [];
var idCount = 0;

var queue = [];
var negativeCaching = false;

var srv = http.createServer(function(req, res) {
	var data = "";
	req.on('data', function(chunk) {
		data = data + chunk;
	});
	req.on('end', function() {
		util.puts(data);
		util.puts(req.url);
		if(/^\/worker/.test(req.url)) {
			if(req.method == 'POST') {
				util.puts(data);
				var worker = JSON.parse(data);
				if(worker.result) {
					resultEmitter.emit('result'+worker.result.id, worker.result);
					if(worker.result.num >= 0 || negativeCaching) {
						cache[worker.result.param] = worker.result.num;
					}
				}
				if(queue.length == 0) {
					workers[worker.id].idle = true;
					res.writeHead(404);
					res.end();
				} else {
					workers[worker.id].idle = false;
					res.writeHead(200);
					res.end(JSON.stringify(queue.pop()));
				}
			}
		}
		if(/^\/register/.test(req.url)) {
			worker = JSON.parse(data);
			workers.push(worker);
			res.writeHead(200);
			res.end(JSON.stringify(workers.length - 1));
		}
		if(/^\/client/.test(req.url)) {
			var reqUrl = url.parse(req.url);
			var param = querystring.parse(reqUrl.query);
			var job = {
				param : param.time,
				id : idCount
			};
			if(cache[param.time]) {
				var answer = {
					num : cache[param.time],
					param : param.time,
					id : -1
				}
				res.writeHead(200);
				res.end(JSON.stringify(answer));
			} else {
				util.puts(JSON.stringify(job));
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
};

function startJob(worker, job) {
	var req = http.request(worker.opts, function(res) {
	});
	req.end(JSON.stringify(job));
}
