var server =require("../server/mock-server"),
Client=require("../../lib/node-rest-client").Client;

describe('IO Facade', function () {
  before(function () {
    server.listen(4444);
    console.log("server started on port 4444");
  });

  describe("#Parsers",function(){

    it.only("add invalid parser to client", function(done){
      var client = new Client();

      client.on('error', function(err){
        err.should.startWith("parser cannot be added: invalid parser definition");
        done();
      });

      client.parsers.add({"invalid":123, "parser":456}).should.throw();
    });


  });


describe("#Serializers",function(){

  it("GET request with no args", function(done){
    var client = new Client();
    client.get(server.baseURL + "/xml", function(data, response){
      console.log("data es ", data);
      data.should.not.equal(null);
      data.should.type("object");
      done();
    });
  });

});

after(function () {
  server.close();
  console.log("server stopped");
});
});