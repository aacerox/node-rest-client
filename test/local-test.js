	var Client = require("../lib/node-rest-client.js").Client;
	var client = new Client();

	console.log("client es ", client);
/*
	client.get("http://localhost:8080/xml",(data,response) => console.log("DATA IS ", data));
*/
	client.addCustomHttpMethod("purge");

	var request = client.purge("http://localhost:8080/xml",(data,response) => console.log("DATA IS ", data) );

	console.log("REQUEST is ", request);
