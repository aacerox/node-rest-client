/* eslint-disable max-len */
import server from '../server/mock-server.js';
import Client from '../../lib/node-rest-client.js';

let client;

describe('GET Promise Method', function() {
  this.timeout(150000);

  const assertPromiseResult = (result) => {
    result.should.not.equal(null);
    result.response.should.not.equal(null);
    result.data.should.not.equal(null);
    result.data.should.type('object');
  };

  before(function() {
    client = new Client({usePromises: true});
    server.listen(4444);
    console.log('server started on port 4444');
  });

  describe('#JSON Promise', () => {
    it('GET Promise request with no args', () => {
      return client.get(server.baseURL + '/json').then((result) => {
        assertPromiseResult(result);
      });
    });

    it('GET Promise request with path variable substitution', () => {
      const args ={
        path: {testNumber: 123, testString: 'test'},
      };
      return client.get(server.baseURL + '/json/path/${testNumber}/${testString}', args).then((result) => {
        assertPromiseResult(result);

        result.data.url.should.equal('/json/path/123/test');
      });
    });


    it('GET Promise request with parameters', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
      };
      return client
          .get(server.baseURL + '/json/path/query', args)
          .then((result) => {
            assertPromiseResult(result);

            result.data.url.should.equal(
                '/json/path/query?testNumber=123&testString=test',
            );
          });
    });

    it('GET Promise request with registered method and no args', () => {
      client.registerMethod('testMethod', server.baseURL + '/json', 'GET');

      return client.methods.testMethod().then((result) => {
        assertPromiseResult(result);
      });
    });


    it('GET Promise request with registered method and path variable substitution', () => {
      const args ={
        path: {testNumber: 123, testString: 'test'},
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/${testNumber}/${testString}', 'GET');

      return client.methods.testMethod(args).then((result) => {
        assertPromiseResult(result);

        result.data.url.should.equal('/json/path/123/test');
      });
    });


    it('GET Promise request with registered method and parameters', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/query', 'GET');

      return client.methods.testMethod(args).then((result) => {
        assertPromiseResult(result);

        result.data.url.should.equal(
            '/json/path/query?testNumber=123&testString=test',
        );
      });
    });

    it('GET Promise request with incompatible parameters URL', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
      };

      client
          .get(
              server.baseURL + '/json/path/query?testNumber=123&testString=test',
              args,
          )
          .then((result) => {
          // noop
          })
          .catch((err)=> {
            err.should.startWith(
                'parameters argument cannot be used if parameters are already defined in URL',
            );
          });
    });

    it('GET Promise request with invalid args type', () => {
      const args = '123';


      client
          .get(server.baseURL + '/json/path/query', args)
          .then((result) => {
          // noop
          })
          .catch((err) => {
            err.should.startWith('args should be and object');
          });
    });


    it('GET Promise request with invalid parameters type', () => {
      const args ={
        parameters: '{test=\'123\'}',
      };

      client.on('error', function(err) {
        err.should.startWith('cannot serialize');
      });


      client.get(server.baseURL + '/json/path/query',
          args)
          .then((result) => {
            // noop
          })
          .catch((err) => {
            err.should.startWith('cannot serialize');
          });
    });

    it('GET Promise request with registered method and incompatible parameters URL', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/query?testNumber=123&testString=test', 'GET');

      client.methods.testMethod(args)
          .then((result) => {
            // noop
          })
          .catch((err) => {
            err.should.startWith(
                'parameters argument cannot be used if parameters are already defined in URL',
            );
          });
    });

    it('GET Promise request with registered method and invalid args type', () => {
      const args ='123';

      client.registerMethod('testMethod', server.baseURL + '/json/path/query', 'GET');

      client.methods
          .testMethod(args)
          .then((result) => {
          // noop
          })
          .catch((err) => {
            err.should.startWith('args should be and object');
          });
    });


    it('GET Promise request with registered method and invalid parameters type', () => {
      const args ={
        parameters: '{test=\'123\'}',
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/query', 'GET');

      client.methods
          .testMethod(args)
          .then((result) => {
          // noop
          })
          .catch((err) => {
            err.should.startWith('cannot serialize');
          });
    });
  });


  describe('#XML', function() {
    it('GET Promise request with no args', function() {
      return client.get(server.baseURL + '/xml').then((result) => {
        console.log('data es ', result.data);
        assertPromiseResult(result);
      });
    });
  });

  after(function() {
    server.close();
    console.log('server stopped');
  });
});
