import http from 'http'
import fs from 'fs'

const RouterOptions = {
	"baseMessageDir" : "",
	"JSONMessageFile" : './test/server/message.json',
	"XMLMessageFile" : './test/server/message.xml'

}

const RouteManager = {
	"findRoute" : function(req, res) {
		let handler = null
		for ( let route in this.routes) {
			if (req.url.startsWith(route)) {
				handler = this.routes[route]
			}

		}
		if (!handler)
			throw new Error("cannot find route " + req.url)
		handler.call(this, req, res)
	},
	"routes" : {
		"/json" : function(req, res) {
			const message = fs
					.readFileSync(RouterOptions.JSONMessageFile, 'utf8')
			res.writeHead(200, {
				'Content-Type' : 'application/json',
				'test-header'  : 'test'
			})
			res.write(message.toString())
			res.end()
		},
		"/json/path" : function(req, res) {			
			const message = {
				"url" : req.url
			}
			res.writeHead(200, {
				'Content-Type' : 'application/json',
				'test-header'  :  req.url
			})
			res.write(JSON.stringify(message))
			res.end()
		},
		"/xml" : function(req, res) {
			const message = fs.readFileSync(RouterOptions.XMLMessageFile, 'utf8')
			res.writeHead(200, {
				'Content-Type' : 'application/xml'
			})
			res.write(message.toString())
			res.end()
		},
		"/120/json?arg1=hello&arg2=world" : function(req, res) {
			if (!req.headers["test-header"])
				throw new Error("no test-header found!!")
			res.setHeader("test-response-header", req.headers["test-header"])
			this.routes["/json"](req, res)
		},
		"/json?post" : function(req, res) {
			req.on('data', function(data) {				
				res.writeHead(200, {
					'Content-Type' : 'application/json'
				})				
				res.write(data.toString())
				res.end()
			})
		},
		"/json/path/post" : function(req, res) {
			req.on('data', function(data) {
				const message = {
					"url" : req.url
				}
				
				res.writeHead(200, {
					'Content-Type' : 'application/json'
				})
				
				message.postData = data.toString()
				res.write(JSON.stringify(message))
				res.end()
			})
		},
		"/json/error" : function(req, res) {
			res.writeHead(500, {'Content-Type': 'text/plain'})
			res.end()
		},
		"/xml/path/post" : function(req, res) {
			req.on('data', function(data) {
				res.writeHead(200, {
					'Content-Type' : 'application/xml'
				})
				res.write(data.toString())
				res.end()
			})
		},
		"/json/empty" : function(req, res) {
			res.writeHead(200, {
				'Content-Type' : 'application/json'
			})
			res.end()
		},
		"/xml/empty" : function(req, res) {
			res.writeHead(204, {
				'Content-Type' : 'application/xml'
			})
			res.end()		},
		"/json/contenttypewithspace" : function(req, res) {
			const message = fs.readFileSync('./message.json', 'utf8')
			res.writeHead(200, {
				'Content-Type' : 'application/json charset=utf-8'
			})
			res.write(message.toString())
			res.end()
		},
		"/json/test/content/type" : function(req, res) {
			const message = fs.readFileSync(RouterOptions.JSONMessageFile, 'utf8')
			res.writeHead(200, {
				'Content-Type' : 'test/json'
			})
			res.write(message.toString())
			res.end()
		},
		"/xml/test/content/type" : function(req, res) {
			const message = fs.readFileSync(RouterOptions.XMLMessageFile, 'utf8')
			res.writeHead(200, {
				'Content-Type' : 'test/xml'
			})
			res.write(message.toString())
			res.end()
		},
		"/followRedirects":function(req, res){

			const repeatOffset = req.url.indexOf("?")
			let repeat = parseInt(req.url.substring(repeatOffset + 1),10)
			

			if (repeatOffset === 0){
				res.writeHead(301, {
					'Location':'http://localhost:4444/redirected'
				})
			}else{
				if (repeat > 0){
					res.writeHead(301, {
						'Location':'http://localhost:4444/followRedirects?' + --repeat
					})
				}else{
					res.writeHead(301, {
						'Location':'http://localhost:4444/redirected'
					})
				}

			}
			res.end()
		},
		"/redirected":function(req, res){
			const message={"redirected":++this.redirectCount}
			res.writeHead(200, {
				'Content-Type' : 'application/json charset=utf-8'
			})
			res.write(JSON.stringify(message))
			res.end()
		}

	},
	"sleep" : function(ms) {
		const stop = new Date().getTime()
		while (new Date().getTime() < stop + ms) {
			// noop
		}
	},
	"redirectCount":0,
	"redirectLimit":10

}

// Create an HTTP server
let server = http.createServer(function(req, res) {
	RouteManager.findRoute(req, res)
})

let mockServer = {
	baseURL: "http://localhost:4444",
	listen: function () {
		server.listen.apply(server, arguments)
	},
	close: function (callback) {
		server.close(callback)
	},
	on: function (event, cb) {
		server.on.apply(server, event, cb)
	}
}

export default mockServer;