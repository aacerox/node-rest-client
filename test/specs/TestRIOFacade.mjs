/* eslint-disable max-len */
import server from '../server/mock-server.mjs';
import Client from '../../dist/mjs/NodeRestClient.js';

describe('IO Facade', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(150000);

  before(function() {
    server.listen(4444);
    console.log('server started on port 4444');
  });

  describe('#Parsers', function() {
    const testParser = {'name': 'test-parser',
      'isDefault': false,
      'match': function(response) {
        return response.headers['test-header'] === 'test';
      },
      'parse': function(byteBuffer, nrcEventEmitter, parsedCallback) {
        const message = JSON.parse(byteBuffer.toString());
        message.parsed = true;
        parsedCallback(message);
      },
    };
    const defaultTestParser = {'name': 'default-test-parser',
      'isDefault': true,
      'parse': function(byteBuffer, nrcEventEmitter, parsedCallback) {
        const message = JSON.parse(byteBuffer.toString());
        message.defaultParsed = true;
        parsedCallback(message);
      },
    };

    it('add invalid parser to client', function(done) {
      const client = new Client();

      client.on('error', function(err) {
        err.message.should.startWith('parser cannot be added: invalid parser definition');
        done();
      });

      client.parsers.add({'invalid': 123, 'parser': 456}).should.throw();
    });


    it('add parser to client', function(done) {
      const client = new Client();
      client.parsers.add(testParser);
      const parser = client.parsers.find('test-parser');

      parser.should.not.equal(null);
      parser.should.type('object');
      done();
    });


    it('remove parser from client', function(done) {
      const client = new Client();

      client.on('error', function(err) {
        err.message.should.startWith('cannot find parser: test-parser doesn\'t exists');
        done();
      });

      client.parsers.add(testParser);
      const parser = client.parsers.find('test-parser');

      parser.should.not.equal(null);
      parser.should.type('object');

      client.parsers.remove('test-parser');
      client.parsers.find('test-parser');
    });

    it('response match parser', function(done) {
      const client = new Client();
      client.parsers.clean();
      client.parsers.add(testParser);

      client.get(server.baseURL + '/json', function(data, response) {
        data.should.not.equal(null);
        data.should.type('object');
        data.should.have.property('parsed');
        data.parsed.should.be.a.Boolean;
        data.parsed.should.be.true;
        done();
      });
    });


    it('add and use default parser', function(done) {
      const client = new Client();
      client.parsers.clean();

      client.parsers.add(testParser);
      client.parsers.add(defaultTestParser);
      // no parsers defined, default must be used

      client.get(server.baseURL + '/json/path?default-test', function(data, response) {
        data.should.not.equal(null);
        data.should.type('object');
        data.should.have.property('defaultParsed');
        data.defaultParsed.should.be.a.Boolean;
        data.defaultParsed.should.be.true;
        done();
      });
    });


    it('add custom types to args in JSON parser', function(done) {
      const options={
        // customize mime types for json or xml connections
        mimetypes: {
          json: ['test/json'],
        },
      };
      const client = new Client(options);

      client.get(server.baseURL + '/json/test/content/type', function(data, response) {
        data.should.not.equal(null);
        data.should.type('object');
        done();
      });
    });


    it('add custom types to args in XML parser', function(done) {
      const options={
      // customize mime types for json or xml connections
        mimetypes: {
          xml: ['test/xml'],
        },
      };
      const client = new Client(options);

      client.get(server.baseURL + '/xml/test/content/type', function(data, response) {
        data.should.not.equal(null);
        data.should.type('object');
        done();
      });
    });


    it('get all regular parsers', function(done) {
      const client = new Client();
      const parsers = client.parsers.getAll();
      parsers.should.have.length(2);
      done();
    });

    it('emit custom event from parser to client', function(done) {
      const client = new Client();
      client.on('customEvent', function(event) {
        event.should.be.equal('my custom event');
        done();
      });


      client.parsers.clean();
      client.parsers.add({
        'name': 'example-parser',
        'isDefault': false,
        'match': function(request) {
          return true;
        },
        'parse': function(byteBuffer, nrcEventEmitter, parsedCallback) {
          nrcEventEmitter('customEvent', 'my custom event');
          // pass serialized data to client to be sent to remote API
          parsedCallback(byteBuffer.toString());
        },
      });

      const args ={data: 'test data'};

      client.post(server.baseURL + '/json/path/post/query', args, function(data, response) {});
    });
  });


  describe('#Serializers', function() {
    const testSerializer = {'name': 'test-serializer',
      'isDefault': false,
      'match': function(request) {
        return request.headers['test-header'] === 'test';
      },
      'serialize': function(data, nrcEventEmitter, serializedCallback) {
        if (typeof data === 'object') {
          data.serialized = true;
        }
        serializedCallback(JSON.stringify(data));
      },
    };
    const defaultTestSerializer = {'name': 'default-test-serializer',
      'isDefault': true,
      'serialize': function(data, nrcEventEmitter, serializedCallback) {
        if (typeof data === 'object') {
          data.defaultParsed = true;
        }
        serializedCallback(data);
      },
    };


    it('add invalid serializer to client', function(done) {
      const client = new Client();

      client.on('error', function(err) {
        err.message.should.startWith('serializer cannot be added: invalid serializer definition');
        done();
      });

      client.serializers.add({'invalid': 123, 'serializer': 456}).should.throw();
    });


    it('add serializer to client', function(done) {
      const client = new Client();
      client.serializers.add(testSerializer);
      const serializer = client.serializers.find('test-serializer');

      serializer.should.not.equal(null);
      serializer.should.type('object');
      done();
    });


    it('remove serializer from client', function(done) {
      const client = new Client();

      client.on('error', function(err) {
        err.message.should.startWith('cannot find serializer: test-serializer doesn\'t exists');
        done();
      });

      client.serializers.add(testSerializer);
      const serializer = client.serializers.find('test-serializer');

      serializer.should.not.equal(null);
      serializer.should.type('object');

      client.serializers.remove('test-serializer');
      client.serializers.find('test-serializer');
    });


    it('request match serializer', function(done) {
      const client = new Client();
      const args={
        headers: {'test-header': 'test'},
        data: {'testNumber': 123, 'testString': 'abc'},
      };

      client.serializers.clean();
      client.serializers.add(testSerializer);

      const request = client.post(server.baseURL + '/json/path/post', args, function(data, response) {
        data.postData.should.not.equal(null);
        data.postData.should.type('string');
        data.postData.includes('serialized').should.be.true();
      });

      done();
    });

    it('get all regular serializers', function(done) {
      const client = new Client();
      const serializers = client.serializers.getAll();
      serializers.should.have.length(3);
      done();
    });

    it('emit custom event from serializer to client', function(done) {
      const client = new Client();
      client.on('customEvent', function(event) {
        event.should.be.equal('my custom event');
        done();
      });


      client.serializers.clean();
      client.serializers.add({
        'name': 'example-serializer',
        'isDefault': false,
        'match': function(request) {
          return true;
        },
        'serialize': function(data, nrcEventEmitter, serializedCallback) {
          nrcEventEmitter('customEvent', 'my custom event');
          // pass serialized data to client to be sent to remote API
          serializedCallback(data.toString());
        },
      });

      const args ={data: 'test data'};

      client.post(server.baseURL + '/json/path/post/query', args, function(data, response) {});
    });
  });

  after(function() {
    server.close();
    console.log('server stopped');
  });
});
