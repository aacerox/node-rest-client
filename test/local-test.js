	var Client = require("../lib/node-rest-client.js").Client;
/*
var options_proxy = {
    proxy: {
        host: "proxy.indra.es",
        port: 8080,
        user: "aacero",
        password: "Nostromo75",
        tunnel: false
    }
};
*/
	var client = new Client();

	console.log("client es ", client);

	client.get("http://localhost:4444/json/empty",(data,response) => console.log("DATA IS ", data));

	/*client.get("http://localhost:8080/xml",(data,response) => console.log("DATA IS ", data));

	client.addCustomHttpMethod("purge");

	var request = client.purge("http://localhost:8080/xml",(data,response) => console.log("DATA IS ", data) );

	console.log("REQUEST is ", request);
	*/

/*
var url="http://www.w3schools.com/html/action_page.php";

var args={
	parameters:{'lastname': 'mouse'}
};

client.registerMethod("api", url ,"GET");

console.log("executing");

client.methods.api(args, function (data, response) {
console.log('response is', response);
if(Buffer.isBuffer(data)){
	data = data.toString('utf8');
}
console.log('data is ', data);
});
*/