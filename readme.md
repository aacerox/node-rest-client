# REST Client for Node.js

Allows connecting to any API REST and get results as js Object. The client has the following features:

- Transparent HTTP/HTTPS connection to remote API sites.
- Allows simple HTTP basic authentication.
- Allows most common HTTP operations: GET, POST, PUT, DELETE.
- Direct or through proxy connection to remote API sites.
- Register remote API operations as client own methods, simplifying reuse.
- Automatic parsing of XML and JSON response documents as js objects.
- dynamic path and query parameters and request headers.


## Installation

$ npm install node-rest-client

## Usages

### Simple HTTP GET

Client has 2 ways to call a REST service: direct or using registered methods

```javascript
var Client = require('node-rest-client').Client;

client = new Client();

// direct way
client.get("http://remote.site/rest/xml/method", function(data, response){
			// parsed response body as js object
			console.log(data);
			// raw response
			console.log(response);
		});

// registering remote methods
client.registerMethod("jsonMethod", "http://remote.site/rest/json/method", "GET");

client.methods.jsonMethod(function(data,response){
	// parsed response body as js object
	console.log(data);
	// raw response
	console.log(response);
});

```


### Passing args to registered methods

You can pass diferents args to registered methods, simplifying reuse: path replace parameters, query parameters, custom headers 

```javascript
var Client = require('node-rest-client').Client;

// direct way
client = new Client();

args ={
		path:{"id":120},
		parameters:{arg1:"hello",arg2:"world"},
		headers:{"test-header":"client-api"}
	  };


client.get("http://remote.site/rest/json/${id}/method?arg1=hello&arg2=world", args, 
			function(data, response){
			// parsed response body as js object
			console.log(data);
			// raw response
			console.log(response);
});


// registering remote methods
client.registerMethod("jsonMethod", "http://remote.site/rest/json/${id}/method", "GET");



/* this would construct the following URL before invocation
 *
 * http://remote.site/rest/json/120/method?arg1=hello&arg2=world
 *
 */ 
client.methods.jsonMethod(args,function(data,response){
	// parsed response body as js object
	console.log(data);
	// raw response
	console.log(response);
});

```

You can even use path placeholders in query string in direct connection:

```javascript
var Client = require('node-rest-client').Client;

// direct way
client = new Client();

args ={
		path:{"id":120,"arg1":"hello","arg2":"world"},
		parameters:{arg1:"hello",arg2:"world"},
		headers:{"test-header":"client-api"}
	  };

client.get("http://remote.site/rest/json/${id}/method?arg1=${arg1}&arg2=${arg2}", args, 
		function(data, response){
			// parsed response body as js object
			console.log(data);
			// raw response
			console.log(response);
});

```



###  HTTP POST and PUT methods

To send data to remote site using POST or PUT methods, just add a data attribute to args object:

```javascript
var Client = require('node-rest-client').Client;

// direct way
client = new Client();

args ={
		path:{"id":120},
		parameters:{arg1:"hello",arg2:"world"},
		headers:{"test-header":"client-api"},
		data:"<xml><arg1>hello</arg1><arg2>world</arg2></xml>"
	  };

client.post("http://remote.site/rest/xml/${id}/method?arg1=hello&arg2=world", args, function(data, response){
			// parsed response body as js object
			console.log(data);
			// raw response
			console.log(response);
});

// registering remote methods
client.registerMethod("xmlMethod", "http://remote.site/rest/xml/${id}/method", "POST");


client.methods.xmlMethod(args,function(data,response){
	// parsed response body as js object
	console.log(data);
	// raw response
	console.log(response);
});

// posted data can be js object
args_js ={
		path:{"id":120},
		parameters:{arg1:"hello",arg2:"world"},
		headers:{"test-header":"client-api"},
		data:{"arg1":"hello","arg2":123}
	  };

client.methods.xmlMethod(args_js,function(data,response){
	// parsed response body as js object
	console.log(data);
	// raw response
	console.log(response);
});

```


### Connect through proxy

Just pass proxy configuration as option to client

```javascript
var Client = require('node-rest-client').Client;

// configure proxy
var options_proxy={
		proxy:{
			host:"proxy.foo.com",
			port:8080,
			user:"proxyuser",
			password:"123"
		}
	},

client = new Client(options_proxy);

```

### Basic HTTP auth

Just pass username and password as option to client. Every request done with the client will pass username and password as basic authorization header.

```javascript
var Client = require('node-rest-client').Client;

// configure basic http auth for every request
var options_auth={user:"admin",password:"123"};

client = new Client(options_auth);

```

### Options parameters

You can pass the following args when creating a new client:

```javascript

var options ={
	// proxy configuration
	proxy:{
			host:"proxy.foo.com", // proxy host
			port:8080, // proxy port
			user:"ellen", // proxy username if required
			password:"ripley" // proxy pass if required
		},
	// aditional connection options passed to node http.request y https.request methods 
	// (ie: options to connect to IIS with SSL)	
	connection:{	
		secureOptions: constants.SSL_OP_NO_TLSv1_2,
		ciphers:'ECDHE-RSA-AES256-SHA:AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
		honorCipherOrder: true
	},
	// customize mime types for json or xml connections
	mimetypes:{
		json:["application/json","application/json;charset=utf-8"],
		xml:["application/xml","application/xml;charset=utf-8"]
	},	
	user:"admin", // basic http auth username if required
	password:"123" // basic http auth password if required
};

```

###  Error Handling

Client can emits error events that can be handled like usually node does.

```javascript

client = new Client(options_auth);

client.on('error',function(err){
	console.error('Something went wrong', err);
});

```