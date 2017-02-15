var server =require("../server/mock-server"),
 Client=require("../../lib/node-rest-client").Client;

describe('GET Method', function () {
  before(function () {
    server.listen(4444);  
    console.log("server started on port 4444")
  });

  describe("#JSON",function(){  	
  	it("Simple GET request with no args", function(done){
  		var client = new Client();
  		client.get(server.baseURL + "/json", function(data, response){  			
  			data.should.not.equal(null);
  			data.should.type("object");
  			done();
  		});
  	});

  	it("Simple GET request with path variable substitution", function(done){
  		var client = new Client();
  		var args ={path:{testNumber:123, testString:"test"}  		}
  		client.get(server.baseURL + "/json/path/${testNumber}/${testString}",args, function(data, response){ 

  			data.should.not.equal(null);
  			data.should.type("object");
        data.url.should.equal("/json/path/123/test");
        console.log(data.url);
  			
  			done();
  		});
  	});

    it.only("GET request with registered method and path variable substitution", function(done){
      var client = new Client();
      var args ={
        path:{testNumber:123, testString:"test"}
      };

      client.registerMethod("testMethod",server.baseURL + "/json/path/${testNumber}/${testString}","GET");

      client.methods.testMethod(args, function(data, response){ 

        data.should.not.equal(null);
        data.should.type("object");
        data.url.should.equal("/json/path/123/test");
        console.log(data.url);
        
        done();
      });
    });



  });


  after(function () {
    server.close();
    console.log("server stopped");
  });
});