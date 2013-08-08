var http = require('http'),
	https = require('https'),
	parseString = require('xml2js').parseString,
	urlParser = require('url'),
	util = require("util");
	events = require("events");


exports.Client = function (options){
	var self = this;

	self.options = options || {},
	self.useProxy = (self.options.proxy || false)?true:false,
	self.proxy = self.options.proxy,
	self.connection = self.options.connection || {},
	self.mimetypes = self.options.mimetypes || {};

	this.methods={};
	

	// Client Request to be passed to ConnectManager and returned
	// for each REST method invocation
	var ClientRequest =function(){
		events.EventEmitter.call(this);
	};

	util.inherits(ClientRequest, events.EventEmitter);
	

	var Util = {

	 createProxyPath:function(url){
	    var result = url.host;
		 // check url protocol to set path in request options
		 if (url.protocol === "https:"){
			// port is set, leave it, otherwise use default https 443
			result = (url.host.indexOf(":") == -1?url.hostname + ":443":url.host);
		}

		return result;
	  },
	 createProxyHeaders:function(){
		var result ={};
		// if proxy requires authentication, create Proxy-Authorization headers
		if (self.proxy.user && self.proxy.password){
			result["Proxy-Authorization"] = "Basic " + new Buffer([self.proxy.user,self.proxy.password].join(":")).toString("base64");
		}

		return result;
	  },
	  createConnectOptions:function(connectURL){
	  	    debug("connect URL = ", connectURL);
			var url = urlParser.parse(connectURL),
				path,
				result={},
				protocol = url.protocol.indexOf(":") == -1?url.protocol:url.protocol.substring(0,url.protocol.indexOf(":")),
				defaultPort = protocol === 'http'?80:443;

		    result ={
				host: url.host.indexOf(":") == -1?url.host:url.host.substring(0,url.host.indexOf(":")),
				port: url.port === undefined?defaultPort:url.port,
				path: url.path,
				protocol:protocol
		     };

		     if (self.useProxy) result.agent = false; // cannot use default agent in proxy mode

		     if (self.options.user && self.options.password)
				result.auth = [self.options.user,self.options.password].join(":");


			// configure proxy connection to establish a tunnel
			if (self.useProxy){
				result.proxy ={
					host: self.proxy.host,
					port: self.proxy.port,
					method: 'CONNECT',
					path: this.createProxyPath(url),
					headers: this.createProxyHeaders()
				    };
			}

            if(self.connection && typeof self.connection === 'object'){
                for(var option in self.connection){
                        result[option] = self.connection[option];
                }
            }

			return result;
		},
		decodeQueryFromURL: function(connectURL){
			var url = urlParser.parse(connectURL),
					  query = url.query.substring(1).split("&"),
					  keyValue,
					  result={};

			// create decoded args from key value elements in query+
			for (var i=0;i<query.length;i++){
				keyValue = query[i].split("=");
				result[keyValue[0]] = decodeURIComponent(keyValue[1]);
			}

			return result;

		},
		encodeQueryFromArgs: function(args){
			var result="?", counter = 1;
			// create enconded URL from args
			for (var key in args){
				var keyValue = key + "=" + encodeURIComponent(args[key]);
				if (counter > 1) keyValue = '&'.concat(keyValue);
				result = result.concat(keyValue);
				
				counter++;
			}

			return result;
		},
		parsePathParameters:function(args,url){
			var result = url;
			if (!args || !args.path) return url;

			for (var placeholder in args.path){
				var regex = new RegExp("\\$\\{" + placeholder + "\\}","i");
				result = result.replace(regex,args.path[placeholder]);
				
			}
			
			return result;

		},
		connect : function(method, url, args, callback, clientRequest){
			// configure connect options based on url parameter parse
			var options = this.createConnectOptions(this.parsePathParameters(args,url));
			options.method = method,
			options.clientRequest = clientRequest;
			debug("options pre connect",options);
			debug("args = ", args);
			debug("args.data = ", args.data);
			// no args passed
			if (typeof args === 'function'){
				callback = args;
			} else if (typeof args === 'object') {
				// add headers and POST/PUT data to connect options to be passed
				// with request
				if (args.headers) options.headers = args.headers;
				if (args.data) options.headers['Content-Length'] = Buffer.byteLength((typeof args.data === 'string' ? args.data:JSON.stringify(args.data)), 'utf8');
				if (args.data) options.data = args.data;
				debug("options ", options);
			}
						
			if (self.useProxy){
				ConnectManager.proxy(options,callback);
			}else{
				ConnectManager.normal(options,callback);
			}
		},
		mergeMimeTypes:function(mimetypes){
			// merge mime-types passed as options to client
			if (mimetypes && typeof mimetypes === "object"){
				if (mimetypes.json && mimetypes.json instanceof Array && mimetypes.json.length > 0){
					ConnectManager.jsonctype = mimetypes.json;
				}else if (mimetypes.xml && mimetypes.xml instanceof Array && mimetypes.xml.length > 0){
					ConnectManager.xmlctype = mimetypes.xml;
				}
			}
		}
	},
	Method = function(url, method){
		var httpMethod = self[method.toLowerCase()];
			
		    return  function(args,callback){
					var completeURL = url;
					//no args
					if (typeof args === 'function'){
						callback = args;
						args = {};
					}else if (typeof args === 'object'){
					// we have args, go and check if we have parameters
						if (args.parameters && Object.keys(args.parameters).length > 0){
							// validate URL consistency, and fix it
							url +=(url.charAt(url.length-1) === '?'?"?":"");
							completeURL = url.concat(Util.encodeQueryFromArgs(args.parameters));
						}
					}
					httpMethod(completeURL, args , callback);
				};
	};




	this.get = function(url, args, callback){
		var clientRequest = new ClientRequest();			
		Util.connect('GET', url, args, callback, clientRequest);		
		return clientRequest;
	};

	this.post = function(url, args, callback){
		var clientRequest = new ClientRequest();
		Util.connect('POST', url, args, callback, clientRequest);
		return clientRequest;
	};

	this.put = function(url, args, callback){
		var clientRequest = new ClientRequest();
		Util.connect('PUT', url, args, callback, clientRequest);
		return clientRequest;
	};

	this.delete = function(url, args, callback){
		var clientRequest = new ClientRequest();
		Util.connect('DELETE', url, args, callback, clientRequest);
		return clientRequest;
	};


	this.registerMethod = function(name, url, method){
		// create method in method registry with preconfigured REST invocation
		// method
		this.methods[name] = new Method(url,method);
	};

	this.unregisterMethod = function(name){
		delete this.methods[name];
	};

	// handle ConnectManager events
	ConnectManager.on('error',function(err){
		self.emit('error',err);
	});
	
	// merge mime types with connect manager
	Util.mergeMimeTypes(self.mimetypes);
	debug("ConnectManager", ConnectManager);

};


	var ConnectManager = {
		"xmlctype":["application/xml","application/xml;charset=utf-8"],
		"jsonctype":["application/json","application/json;charset=utf-8"],
		"isXML":function(content){
			var result = false;
			for (var i=0; i<this.xmlctype.length;i++){
				result = this.xmlctype[i] === content;
				if (result) break;
			}
			
			return result;
		},
		"isJSON":function(content){
			var result = false;
			for (var i=0; i<this.jsonctype.length;i++){
				result = this.jsonctype[i] === content;
				if (result) break;
			}
			
			return result;
		},
		"proxy":function(options, callback){

			debug("proxy options",options.proxy);
			
			// creare a new proxy tunnel, and use to connect to API URL
			var proxyTunnel = http.request(options.proxy),
				self = this;
		
			
			proxyTunnel.on('connect',function(res, socket, head){
				debug("proxy connected",socket);
				// set tunnel socket in request options
				options.socket = socket;

				var buffer=[],
					protocol = (options.protocol =="http")?http:https,
					clientRequest = options.clientRequest;
				
				//remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
				delete options.protocol;
				delete options.clientRequest;

				// add request options to request returned to calling method
				clientRequest.options = options;

				var request = protocol.request(options, function(res){
						// concurrent data chunk handler
						res.on('data',function(chunk){
							buffer.push(chunk);
						});

						res.on('end',function(){
							var data = buffer.join("");

							var content = res.headers["content-type"];
							
							// XML data need to be parsed as JS object
							if (self.isXML(content)){
								parseString(data, function (err, result) {
							          callback(result, res);
							    });
							}else if (self.isJSON(content)){
								callback(JSON.parse(data), res);
							}else{
								callback(data, res);
							}
							
						});


						// handler response errors
						res.on('error',function(err){
							if (clientRequest !== undefined && typeof clientRequest === 'object'){
								// add request as property of error
								err.request = clientRequest;
								err.response =  res;
								// request error handler
								clientRequest.emit('error',err);
							}else{
								// general error handler
								self.emit('error',err);
							}
						});
				});
				
				// write POST/PUT data to request body;
				if(options.data) req.write(typeof options.data === 'object'?JSON.stringify(options.data):options.data);


				// handle request errors and handle them by request or general error handler
				request.on('error',function(err){
					if (clientRequest !== undefined && typeof clientRequest === 'object'){
						// add request as property of error
						err.request = clientRequest;
						
						// request error handler
						clientRequest.emit('error',err);
					}else{
						// general error handler
						self.emit('error',err);
					}
				});

				request.end();
			});

			// proxy tunnel error are only handled by general error handler
			proxyTunnel.on('error',function(e){
				self.emit('error',e);
			});

			proxyTunnel.end();
			
		},
		"normal":function(options, callback){

				var buffer = [],
				protocol = (options.protocol === "http")?http:https,
				clientRequest = options.clientRequest,
				self = this;
				
				//remove "protocol" and "clientRequest" option from options, cos is not allowed by http/hppts node objects
				delete options.protocol;
				delete options.clientRequest;
				debug("options pre connect", options);

				// add request options to request returned to calling method
				clientRequest.options = options;

				var request = protocol.request(options, function(res){
						// concurrent data chunk handler
						res.on('data',function(chunk){
							buffer.push(chunk);
						});

						res.on('end',function(){
							var data = buffer.join("");

							var content = res.headers["content-type"];
							
							debug("typeof data es ", typeof data);
							debug("content-type es", content);

							// XML data need to be parsed as JS object
							if (self.isXML(content)){
								parseString(data, function (err, result) {
							          callback(result, res);
							    });
							}else if (self.isJSON(content)){
								callback(JSON.parse(data), res);
							}else{
								callback(data, res);
							}
						});


						// handler response errors
						res.on('error',function(err){
							if (clientRequest !== undefined && typeof clientRequest === 'object'){
								// add request as property of error
								err.request = clientRequest;
								err.response = res;
								// request error handler
								clientRequest.emit('error',err);
							}else{
								// general error handler
								self.emit('error',err);
							}
						});
				});
			 
				// handle request errors and handle them by request or general error handler
				request.on('error',function(err){
					debug('request error', clientRequest);
					if (clientRequest !== undefined && typeof clientRequest === 'object'){
						// add request as property of error
						err.request = clientRequest;
						// request error handler
						clientRequest.emit('error',err);
					}else{
						// general error handler
						self.emit('error',err);
					}
				});


			 debug("options data", options.data);
			// write POST/PUT data to request body;
			if(options.data) request.write(typeof options.data === 'object'?JSON.stringify(options.data):options.data);

			 request.end();
			 
		}
	};


	// event handlers for client and ConnectManager
	util.inherits(exports.Client, events.EventEmitter);
	util._extend(ConnectManager,events.EventEmitter.prototype);


	var debug = function(){
		if (!process.env.DEBUG) return;

		var now = new Date(),
			header =now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() +  " [API CLIENT]" + arguments.callee.caller.name + " -> ",
			args = Array.prototype.slice.call(arguments);
		args.splice(0,0,header);
		console.log.apply(console,args);


	};

