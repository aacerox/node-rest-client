var http = require('http'),
	fs = require('fs');

var RouterOptions={ 
		"baseMessageDir": "",
		"JSONMessageFile": './test/server/message.json',
		"XMLMessageFile":  './test/server/message.xml'

}

var RouteManager ={
	"findRoute":function(req,res){
		var handler = null
		for(route in this.routes){
			if (req.url.startsWith(route)){
				handler = this.routes[route];
			}

		}		 
		if (!handler) throw "cannot find route " + req.url;
		handler.call(this,req,res);
	},
	"routes":{
			"/json":function(req,res){
				//this.sleep(5000);
				var message = fs.readFileSync(RouterOptions.JSONMessageFile,'utf8');
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.write(message.toString());
				res.end();
			},
			"/json/path":function(req,res){
				//this.sleep(5000);
				var message = {"url": req.url};
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.write(JSON.stringify(message));
				res.end();
			},
			"/xml":function(req,res){
				var message = fs.readFileSync(RouterOptions.XMLMessageFile,'utf8');
				res.writeHead(200, {'Content-Type': 'application/xml'});
				res.write(message.toString());
				res.end();
			},
			"/120/json?arg1=hello&arg2=world":function(req,res){
					if (!req.headers["test-header"]) throw "no test-header found!!";
					res.setHeader("test-response-header",req.headers["test-header"]);
					this.routes["/json"](req,res);
			},
			"/json?post":function(req,res){
				req.on('data',function(data){
					//console.log("[SERVER] data = ", data);
					res.writeHead(200, {'Content-Type': 'application/json'});
					//res.writeHead(200, {'Content-Type': 'text/plain'});
					res.write(data.toString());
					res.end();
				});
					
			},
			"/json/empty":function(req,res){
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end();
			},
			"/xml/empty":function(req,res){
				res.writeHead(204, {'Content-Type': 'application/xml'});
				res.end();
			},
			"/json/contenttypewithspace":function(req,res){
				var message = fs.readFileSync('./message.json','utf8');
				res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
				res.write(message.toString());
				res.end();
			}
	},
	"sleep":function(ms){
		
    var stop = new Date().getTime();
    	while(new Date().getTime() < stop + ms) {
      ;
    	}
	}

};




// Create an HTTP server
this.server = http.createServer(function (req, res) {
	//console.log("[SERVER] req.url", req.url);
	RouteManager.findRoute(req,res);
});

exports.baseURL ="http://localhost:4444";

exports.listen = function () {
  this.server.listen.apply(this.server, arguments);
};

exports.close = function (callback) {
  this.server.close(callback);
};



exports.on = function(event, cb){
	this.server.on.apply(this.server,event,cb);
};

