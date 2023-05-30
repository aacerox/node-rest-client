import server from '../server/mock-server.js';
import Client from '../../lib/NodeRestClient.js';

describe('Follows Redirects', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(150000);

  before(function() {
    server.listen(4444);
    console.log('server started on port 4444');
  });

  describe('#Follows Redirects', function() {
    it('follows Redirect', function(done) {
      const client = new Client();

      client.post(
          server.baseURL + '/followRedirects',
          function(data, response) {
            data.should.not.equal(null);
            data.should.type('object');
            data.redirected.should.equal(1);
            done();
          },
      );
    });

    it('disable follows Redirect', function(done) {
      const client = new Client();
      const args = {
        requestConfig: {followRedirects: false},
      };

      client.post(
          server.baseURL + '/followRedirects',
          args,
          function(data, response) {
            response.statusCode.should.be.equal(301);
            done();
          },
      );
    });

    it('set max redirects', function(done) {
      const client = new Client();
      const args = {
        requestConfig: {maxRedirects: 3},
      };

      const req = client.post(
          server.baseURL + '/followRedirects?5',
          args,
          function(data, response) {
            response.statusCode.should.be.equal(301);
          },
      );

      req.on('error', function(err) {
        err.message.should.be.equal('Maximum number of redirects exceeded');
        done();
      });
    });
  });

  after(function() {
    server.close();
    console.log('server stopped');
  });
});
