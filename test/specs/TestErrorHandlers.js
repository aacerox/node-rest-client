import server from "../server/mock-server.js"
import Client from '../../lib/node-rest-client.js'


describe('Error Handlers', function () {
	
  this.timeout(150000)
	
  before(function () {
    server.listen(4444)
    console.log("server started on port 4444")
  })

  describe("Client Error Handlers",function(){


    it("handle error with client handler", function(done){
      let client = new Client()
      client.on('error', function(err){        
        done()
      })
      client.get(server.baseURL + "/json/error", function(data, response){
        client.emit('error', response.status)  
      })

    })




  })

describe("#Request Error Handlers",function(){

   it("handle error with request handler", function(done){
      let client = new Client()

      let req =client.get(server.baseURL + "/json/error", function(data, response){
        req.emit('error', response.status) 
      })

      req.on('error',function(err){
        done()
      })

    })

})

after(function () {
  server.close()
  console.log("server stopped")
})

})