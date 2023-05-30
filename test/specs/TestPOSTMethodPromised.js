/* eslint-disable max-len */
import server from '../server/mock-server.js';
import Client from '../../lib/NodeRestClient.js';

let client;

describe('POST Promise Method', function() {
  // eslint-disable-next-line no-invalid-this
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

  describe('#JSON', function() {
    it('POST promise request with path variable substitution', () => {
      const args ={
        path: {testNumber: 123, testString: 'test'},
        data: '{"dataNumber":123, "dataString":"test"}',

      };

      return client.post( server.baseURL + '/json/path/post/${testNumber}/${testString}',
          args).then( (result) => {
        assertPromiseResult(result);
        result.data.url.should.equal('/json/path/post/123/test');
        result.data.postData.should.equal(
            '{"dataNumber":123, "dataString":"test"}',
        );
      });
    });


    it('POST Promise request with parameters', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
        data: '{"dataNumber":123,"dataString":"test"}',
      };
      return client.post(server.baseURL + '/json/path/post/query',
          args).then(
          (result) => {
            assertPromiseResult(result);
            result.data.url.should.equal('/json/path/post/query?testNumber=123&testString=test');
            result.data.postData.should.equal('{"dataNumber":123,"dataString":"test"}');
          });
    });

    it('POST Promise request with registered method and no args', () => {
      client.registerMethod('testMethod', server.baseURL + '/json', 'POST');

      return client.methods.testMethod().then((result) => assertPromiseResult(result));
    });


    it('POST Promise request with registered method and path variable substitution', () => {
      const args ={
        path: {testNumber: 123, testString: 'test'},
        data: '{"dataNumber":123,"dataString":"test"}',
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/post/${testNumber}/${testString}', 'POST');

      return client.methods.testMethod(args).then((result) =>{
        assertPromiseResult(result);
        result.data.url.should.equal('/json/path/post/123/test');
        result.data.postData.should.equal('{"dataNumber":123,"dataString":"test"}');
      });
    });


    it('POST Promise request with registered method and parameters', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
        data: '{"dataNumber":123,"dataString":"test"}',
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/post/query', 'POST');

      return client.methods.testMethod(args).then((result) => {
        assertPromiseResult(result);
        result.data.url.should.equal('/json/path/post/query?testNumber=123&testString=test');
        result.data.postData.should.equal('{"dataNumber":123,"dataString":"test"}');
      });
    });

    it('POST Promise request with incompatible parameters URL', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
        data: {dataNumber: 123, dataString: 'test'},
      };

      client
          .post(
              server.baseURL +
            '/json/path/post/query?testNumber=123&testString=test',
              args,
          )
          .then((result) => {
          // noop
          }).catch((err) =>
            err.should.startWith('parameters argument cannot be used if parameters are already defined in URL'));
    });

    it('POST Promise request with invalid args type', () => {
      const args = '123';

      client
          .post(server.baseURL + '/json/path/post/query', args)
          .then((result) => {
          // noop
          }).catch((err) => err.should.startWith('args should be and object'));
    });


    it('POST Promise request with invalid parameters type', () => {
      const args ={
        parameters: '{test=\'123\'}',
      };

      client.on('error', function(err) {
        done();
      });


      client
          .post(server.baseURL + '/json/path/post/query', args)
          .then((result) => {
          // noop
          }).catch((err) => err.should.startWith('cannot serialize'));
    });

    it('POST Promise request with registered method and incompatible parameters URL', () => {
      const args ={
        parameters: {testNumber: 123, testString: 'test'},
        data: {dataNumber: 123, dataString: 'test'},
      };

      client.registerMethod('testMethod', server.baseURL + '/json/path/post/query?testNumber=123&testString=test', 'POST');
      client.methods
          .testMethod(args)
          .then((result) => {
          // noop
          }).catch((err) => err.should.startWith('parameters argument cannot be used if parameters are already defined in URL'));
    });

    it('POST Promise request with registered method and invalid args type', () => {
      const args ='123';

      client.registerMethod('testMethod', server.baseURL + '/json/path/post/query', 'POST');

      client.methods
          .testMethod(args)
          .then((result) => {
          // noop
          })
          .catch((err) => err.should.startWith('args should be and object'));
    });


    it('POST Promise request with registered method and invalid parameters type', () => {
      const args ={
        parameters: '{test=\'123\'}',
      };


      client.registerMethod('testMethod', server.baseURL + '/json/path/post/query', 'POST');

      client.methods
          .testMethod(args)
          .then((result) => {
          // noop
          }).catch((err) => err.should.startWith('cannot serialize'));
    });
  });

  describe('POST Promise #XML', function() {
    it('POST Promise request with parameters', () => {
      const args ={
        data: '<?xml version=\'1.0\'?><testData><testNumber>123</testNumber><testString>123</testString></testData>',
      };
      return client.post(server.baseURL + '/xml/path/post/query', args).then((result) => {
        result.data.should.type('object');
        result.data.testData.should.be.ok;
        result.data.testData.testNumber.should.be.ok;
        result.data.testData.testString.should.be.ok;
        result.data.testData.testNumber.should.be.a.Number;
        result.data.testData.testString.should.be.a.String;
        result.data.testData.testNumber.should.be.equal('123');
        result.data.testData.testString.should.be.equal('123');
      });
    });
  });

  after(function() {
    server.close();
    console.log('server stopped');
  });
});
