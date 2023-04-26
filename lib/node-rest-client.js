'use strict';

import followRedirect from 'follow-redirects';
import urlParser from 'url';
import util from 'util';
import zlib from 'zlib';
import events from 'events';
import ClientRequest from './ClientRequest.js';
import ParserManager from './nrc-parser-manager.js';
import SerializerManager from './nrc-serializer-manager.js';
import debug from 'debug';

const {http, https} = followRedirect;
const node_debug = debug('NRC');

const nodeRestClient = function(options) {
  const self = this;
  // parser response manager
  const parserManager = ParserManager();
  const serializerManager = SerializerManager();
  // connection manager
  const connectManager = new ConnectManager(this, parserManager);
  // io facade to parsers and serializers
  const ioFacade = (function(parserManager, serializerManager) {
    // error execution context
    const errorContext = (parserFn) =>
      function() {
        try {
          return parserFn.apply(this, arguments);
        } catch (err) {
          self.emit('error', err);
        }
      };
    const result = {parsers: {}, serializers: {}};

    // parsers facade
    result.parsers.add = errorContext(parserManager.add).bind(parserManager);
    result.parsers.remove = errorContext(parserManager.remove).bind(
        parserManager,
    );
    result.parsers.find = errorContext(parserManager.find).bind(parserManager);
    result.parsers.getAll = errorContext(parserManager.getAll).bind(
        parserManager,
    );
    result.parsers.getDefault = errorContext(parserManager.getDefault).bind(
        parserManager,
    );
    result.parsers.clean = errorContext(parserManager.clean).bind(
        parserManager,
    );

    // serializers facade
    result.serializers.add = errorContext(serializerManager.add).bind(
        serializerManager,
    );
    result.serializers.remove = errorContext(serializerManager.remove).bind(
        serializerManager,
    );
    result.serializers.find = errorContext(serializerManager.find).bind(
        serializerManager,
    );
    result.serializers.getAll = errorContext(serializerManager.getAll).bind(
        serializerManager,
    );
    result.serializers.getDefault = errorContext(
        serializerManager.getDefault,
    ).bind(serializerManager);
    result.serializers.clean = errorContext(serializerManager.clean).bind(
        serializerManager,
    );

    return result;
  })(parserManager, serializerManager);
  // declare util constants
  const CONSTANTS = {
    HEADER_CONTENT_LENGTH: 'Content-Length',
  };

  (self.options = options || {}),
  (self.useProxy = self.options.proxy || false ? true : false),
  (self.useProxyTunnel =
      !self.useProxy || self.options.proxy.tunnel === undefined ?
        false :
        self.options.proxy.tunnel),
  (self.proxy = self.options.proxy),
  (self.connection = self.options.connection || {}),
  (self.mimetypes = self.options.mimetypes || {}),
  (self.requestConfig = self.options.requestConfig || {}),
  (self.responseConfig = self.options.responseConfig || {});

  // namespaces for methods, parsers y serializers
  this.methods = {};
  this.parsers = {};
  this.serializers = {};

  const Util = {
    createProxyPath: function(url) {
      let result = url.host;
      // check url protocol to set path in request options
      if (url.protocol === 'https:') {
        // port is set, leave it, otherwise use default https 443
        result = url.host.indexOf(':') == -1 ? url.hostname + ':443' : url.host;
      }

      return result;
    },
    createProxyHeaders: function(url) {
      const result = {};
      // if proxy requires authentication, create Proxy-Authorization headers
      if (self.proxy.user && self.proxy.password) {
        result['Proxy-Authorization'] =
          'Basic ' +
          new Buffer([self.proxy.user, self.proxy.password].join(':')).toString(
              'base64',
          );
      }
      // no tunnel proxy connection, we add the host to the headers
      if (!self.useProxyTunnel) {
        result['host'] = url.host;
      }

      return result;
    },
    createConnectOptions: function(connectURL, connectMethod) {
      debug('connect URL = ', connectURL);
      const url = urlParser.parse(connectURL);
      let path;
      let result = {};
      const protocol =
        url.protocol.indexOf(':') == -1 ?
          url.protocol :
          url.protocol.substring(0, url.protocol.indexOf(':'));
      const defaultPort = protocol === 'http' ? 80 : 443;

      result = {
        host:
          url.host.indexOf(':') == -1 ?
            url.host :
            url.host.substring(0, url.host.indexOf(':')),
        port: url.port === undefined ? defaultPort : url.port,
        path: url.path,
        protocol: protocol,
        href: url.href,
      };

      if (self.useProxy) result.agent = false; // cannot use default
      // agent in proxy mode

      if (self.options.user && self.options.password) {
        result.auth = [self.options.user, self.options.password].join(':');
      } else if (self.options.user && !self.options.password) {
        // some sites only needs user with no password to
        // authenticate
        result.auth = self.options.user + ':';
      }

      // configure proxy connection to establish a tunnel
      if (self.useProxy) {
        result.proxy = {
          host: self.proxy.host,
          port: self.proxy.port,
          method: self.useProxyTunnel ? 'CONNECT' : connectMethod, // if
          // proxy
          // tunnel
          // use
          // 'CONNECT'
          // method,
          // else
          // get
          // method
          // from
          // request,
          path: self.useProxyTunnel ? this.createProxyPath(url) : connectURL, // if
          // proxy
          // tunnel
          // set
          // proxy
          // path
          // else
          // get
          // request
          // path,
          headers: this.createProxyHeaders(url), // createProxyHeaders
          // add correct
          // headers depending
          // of proxy
          // connection type
        };
      }

      if (self.connection && typeof self.connection === 'object') {
        for (const option in self.connection) {
          result[option] = self.connection[option];
        }
      }

      // don't use tunnel to connect to proxy, direct request
      // and delete proxy options
      if (!self.useProxyTunnel) {
        for (const proxyOption in result.proxy) {
          result[proxyOption] = result.proxy[proxyOption];
        }

        delete result.proxy;
      }

      // add general request and response config to connect options

      result.requestConfig = self.requestConfig;
      result.responseConfig = self.responseConfig;

      return result;
    },
    decodeQueryFromURL: function(connectURL) {
      const url = urlParser.parse(connectURL);
      const query = url.query.substring(1).split('&');
      let keyValue;
      const result = {};

      // create decoded args from key value elements in query+
      for (const element of query) {
        keyValue = element.split('=');
        result[keyValue[0]] = decodeURIComponent(keyValue[1]);
      }

      return result;
    },
    serializeEncodeQueryFromArgs: function(args) {
      function serialize(obj, parent) {
        const tokens = [];
        let propertyName;
        // iterate over all properties
        for (propertyName in obj) {
          // if object has property (it's not an array iteration)
          if (obj.hasOwnProperty(propertyName)) {
            // if property has parent, add nested reference
            const parsedProperty = parent ?
              parent + '[' + propertyName + ']' :
              propertyName;
            const propertyValue = obj[propertyName];

            // if property has value and is object (we must iterate
            // again, not final leaf)
            // iterate over object property passing current parsed
            // property as parent
            // else add encoded parsed property and value to result
            // array
            tokens.push(
              propertyValue !== null && typeof propertyValue === 'object' ?
                serialize(propertyValue, parsedProperty) :
                encodeURIComponent(parsedProperty) +
                    '=' +
                    encodeURIComponent(propertyValue),
            );
          }
        }
        return tokens.join('&');
      }

      debug('args is', args);
      // check args consistency
      if (args && typeof args !== 'object') {
        self.emit(
            'error',
            'cannot serialize parameters: invalid type ' +
            typeof args +
            ' should be an object type',
        );
      }

      return serialize(args);
    },
    parsePathParameters: function(args, url) {
      let result = url;
      if (!args || !args.path) return url;

      for (const placeholder in args.path) {
        const regex = new RegExp('\\$\\{' + placeholder + '\\}', 'i');
        result = result.replace(regex, args.path[placeholder]);
      }

      return result;
    },
    overrideClientConfig: function(connectOptions, methodOptions) {
      function validateReqResOptions(reqResOption) {
        return reqResOption && typeof reqResOption === 'object';
      }
      // check if we have particular request or response config set on
      // this method invocation
      // and override general request/response config
      if (validateReqResOptions(methodOptions.requestConfig)) {
        util._extend(connectOptions.requestConfig, methodOptions.requestConfig);
      }

      if (validateReqResOptions(methodOptions.responseConfig)) {
        util._extend(
            connectOptions.responseConfig,
            methodOptions.responseConfig,
        );
      }
    },
    connect: function(method, url, args, callback, clientRequest) {
      // wrapper for emit function on client
      const clientEmitterWrapper = function(client) {
        var client = client;
        return function(type, event) {
          client.emit(type, event);
        };
      };

      // check args type if we use it
      if (callback && args && typeof args !== 'object') {
        self.emit('error', 'args should be and object');
      }

      // configure connect options based on url parameter parse
      const options = this.createConnectOptions(
          this.parsePathParameters(args, url),
          method,
      );
      debug('options pre connect', options);
      (options.method = method),
      (clientRequest.href = options.href),
      (options.clientRequest = clientRequest),
      (options.headers = options.headers || {});

      debug('args = ', args);
      debug('args.data = ', args !== undefined ? args.data : undefined);
      // no args passed
      if (typeof args === 'function') {
        callback = args;
        // add Content-length to POST/PUT/DELETE/PATCH methods
        if (
          method === 'POST' ||
          method === 'PUT' ||
          method === 'DELETE' ||
          method === 'PATCH'
        ) {
          options.headers[CONSTANTS.HEADER_CONTENT_LENGTH] = 0;
        }
      } else if (typeof args === 'object') {
        // add headers and POST/PUT/DELETE/PATCH data to connect options
        // to be passed
        // with request, but without deleting other headers like
        // non-tunnel proxy headers
        if (args.headers) {
          for (const headerName in args.headers) {
            if (args.headers.hasOwnProperty(headerName)) {
              options.headers[headerName] = args.headers[headerName];
            }
          }
        }

        // we have args, go and check if we have parameters
        if (args.parameters && Object.keys(args.parameters).length > 0) {
          // validate URL consistency, and fix it adding query
          // parameter separation char

          // check if URL already has '?' path parameter separator
          // char in any position that is not final
          // if true throw error
          const pathLength = options.path.length;
          const pathParameterSepCharPos = options.path.indexOf('?');

          if (
            pathParameterSepCharPos >= 0 &&
            pathParameterSepCharPos !== pathLength - 1
          ) {
            self.emit(
                'error',
                'parameters argument cannot be used if parameters are already defined in URL ' +
                options.path,
            );
          }

          options.path +=
            options.path.charAt(pathLength - 1) === '?' ? '' : '?';
          // check if we have serializable parameter container, that
          // must be serialized and encoded
          // directly, as javascript object
          options.path = options.path.concat(
              Util.serializeEncodeQueryFromArgs(args.parameters),
          );
          debug('options.path after request parameters = ', options.path);
        }

        // override client config, by the moment just for request
        // response config
        this.overrideClientConfig(options, args);

        // always set Content-length header if not set previously
        // set Content lentgh for some servers to work (nginx, apache)
        if (
          args.data !== undefined &&
          !options.headers.hasOwnProperty(CONSTANTS.HEADER_CONTENT_LENGTH)
        ) {
          serializerManager
              .get(options)
              .serialize(
                  args.data,
                  clientEmitterWrapper(self),
                  function(serializedData) {
                    options.data = serializedData;
                    options.headers[CONSTANTS.HEADER_CONTENT_LENGTH] =
                  Buffer.byteLength(options.data, 'utf8');
                  },
              );
        } else {
          options.headers[CONSTANTS.HEADER_CONTENT_LENGTH] = 0;
        }
      }

      debug('options post connect', options);
      debug('FINAL SELF object  ====>', self);

      if (self.useProxy && self.useProxyTunnel) {
        connectManager.proxy(options, callback);
      } else {
        // normal connection and direct proxy connections (no tunneling)
        connectManager.normal(options, callback);
      }
    },
    mergeMimeTypes: function(mimetypes) {
      // this function is left for backward compatibility, but will be
      // deleted in future releases
      let parser = null;
      // merge mime-types passed as options to parsers
      if (mimetypes && typeof mimetypes === 'object') {
        try {
          if (
            mimetypes.json &&
            mimetypes.json instanceof Array &&
            mimetypes.json.length > 0
          ) {
            parser = parserManager.find('JSON');
            parser.contentTypes = mimetypes.json;
          } else if (
            mimetypes.xml &&
            mimetypes.xml instanceof Array &&
            mimetypes.xml.length > 0
          ) {
            parser = parserManager.find('XML');
            parser.contentTypes = mimetypes.xml;
          }
        } catch (err) {
          self.emit(
              'error',
              'cannot assign custom content types to parser, cause: ' + err,
          );
        }
      }
    },
    createHttpMethod: function(methodName) {
      return function(url, args, callback) {
        const clientRequest = new ClientRequest();
        Util.connect(
            methodName.toUpperCase(),
            url,
            args,
            callback,
            clientRequest,
        );
        return clientRequest;
      };
    },
  };
  const Method = function(url, method) {
    const httpMethod = self[method.toLowerCase()];

    return function(args, callback) {
      const completeURL = url;
      // no args
      if (typeof args === 'function') {
        callback = args;
        args = {};
      }

      return httpMethod(completeURL, args, callback);
    };
  };

  this.get = Util.createHttpMethod('get');

  this.post = Util.createHttpMethod('post');

  this.put = Util.createHttpMethod('put');

  this.delete = Util.createHttpMethod('delete');

  this.patch = Util.createHttpMethod('patch');

  this.registerMethod = function(name, url, method) {
    // create method in method registry with preconfigured REST invocation
    // method
    this.methods[name] = new Method(url, method);
  };

  this.unregisterMethod = function(name) {
    delete this.methods[name];
  };

  this.addCustomHttpMethod = function(methodName) {
    self[methodName.toLowerCase()] = Util.createHttpMethod(methodName);
  };

  this.parsers = ioFacade.parsers;

  this.serializers = ioFacade.serializers;

  // merge mime types with connect manager
  Util.mergeMimeTypes(self.mimetypes);
  debug('ConnectManager', connectManager);
};

class ConnectManager {
  #parserManager;
  #client;
  constructor(client, parserManager) {
    this.#parserManager = parserManager;
    this.#client = client;
  }

  clientEmitterWrapper(client) {
    return (type, event) => client.emit(type, event);
  }

  configureRequest(req, config, clientRequest) {
    if (config.timeout) {
      req.setTimeout(config.timeout, () =>
        clientRequest.emit('requestTimeout', req),
      );
    }

    if (config.noDelay) {
      req.setNoDelay(config.noDelay);
    }

    if (config.keepAlive) {
      req.setSocketKeepAlive(config.noDelay, config.keepAliveDelay || 0);
    }
  }

  configureResponse(res, config, clientRequest) {
    if (config.timeout) {
      res.setTimeout(config.timeout, () => {
        clientRequest.emit('responseTimeout', res);
        res.close();
      });
    }
  }

  configureOptions(options) {
    const followRedirectsProps = ['followRedirects', 'maxRedirects'];

    // add follows-redirects config
    followRedirectsProps.forEach((redirectProp) => {
      if (options.requestConfig.hasOwnProperty(redirectProp)) {
        options[redirectProp] = options.requestConfig[redirectProp];
      }
    });

    // remove "protocol" and "clientRequest" option from options,
    // cos is not allowed by http/https node objects
    delete options.protocol;
    delete options.clientRequest;
    delete options.requestConfig;
    delete options.responseConfig;
    debug('options pre connect', options);
  }

  handleEnd(res, buffer, callback) {
    const content = res.headers['content-type'];
    const encoding = res.headers['content-encoding'];

    debug('content-type: ', content);
    debug('content-encoding: ', encoding);

    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      debug('gunzip');
      zlib.gunzip(Buffer.concat(buffer), (er, gunzipped) => {
        this.handleResponse(res, gunzipped, callback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      debug('inflate');
      zlib.inflate(Buffer.concat(buffer), (er, inflated) =>
        this.handleResponse(res, inflated, callback),
      );
    } else {
      debug('not compressed');
      this.handleResponse(res, Buffer.concat(buffer), callback);
    }
  }

  handleResponse(res, data, callback) {
    // find valid parser to be used with response content type, first one
    // found
    this.#parserManager
        .get(res)
        .parse(data, this.clientEmitterWrapper(this.#client), (parsedData) =>
          callback(parsedData, res),
        );
  }

  prepareData(data) {
    let result;
    if (data instanceof Buffer || typeof data !== 'object') {
      result = data;
    } else {
      result = JSON.stringify(data);
    }
    return result;
  }

  proxy(options, callback) {
    debug('proxy options', options.proxy);

    // creare a new proxy tunnel, and use to connect to API URL
    const proxyTunnel = http.request(options.proxy);
    const self = this;

    proxyTunnel.on('connect', (res, socket, head) => {
      debug('proxy connected', socket);

      // set tunnel socket in request options, that's the tunnel
      // itself
      options.socket = socket;

      const buffer = [];
      const protocol = options.protocol == 'http' ? http : https;
      const clientRequest = options.clientRequest;
      const requestConfig = options.requestConfig;
      const responseConfig = options.responseConfig;

      self.configureOptions(options);

      // add request options to request returned to calling method
      clientRequest.options = options;

      // configure proxy request
      const request = protocol.request(options, (res) => {
        // configure response
        self.configureResponse(res, responseConfig, clientRequest);

        // concurrent data chunk handler
        res.on('data', (chunk) => buffer.push(Buffer.from(chunk)));
        res.on('end', () => this.handleEnd(res, buffer, callback));

        // handler response errors
        res.on('error', (err) => {
          if (
            clientRequest !== undefined &&
            typeof clientRequest === 'object'
          ) {
            // add request as property of error
            err.request = clientRequest;
            err.response = res;
            // request error handler
            clientRequest.emit('error', err);
          } else {
            // general error handler
            client.emit('error', err);
          }
        });
      });

      // configure request and add it to clientRequest
      // and add it to request returned
      self.configureRequest(request, requestConfig, clientRequest);
      clientRequest.setHttpRequest(request);

      // write POST/PUT data to request body;
      // find valid serializer to be used to serialize request data,
      // first one found
      // is the one to be used.if none found for match condition,
      // default serializer is used
      if (options.data) {
        request.write(options.data);
      }

      request.end();

      // handle request errors and handle them by request or general
      // error handler
      request.on('error', function(err) {
        if (clientRequest !== undefined && typeof clientRequest === 'object') {
          // add request as property of error
          err.request = clientRequest;

          // request error handler
          clientRequest.emit('error', err);
        } else {
          // general error handler
          client.emit('error', err);
        }
      });
    });

    // proxy tunnel error are only handled by general error handler
    proxyTunnel.on('error', (error) => client.emit('error', error));
    proxyTunnel.end();
  }

  normal(options, callback) {
    const buffer = [];
    const protocol = options.protocol === 'http' ? http : https;
    const clientRequest = options.clientRequest;
    const requestConfig = options.requestConfig;
    const responseConfig = options.responseConfig;
    const self = this;

    this.configureOptions(options);

    // add request options to request returned to calling method
    clientRequest.options = options;

    const request = protocol.request(options, function(res) {
      // configure response
      self.configureResponse(res, responseConfig, clientRequest);

      // concurrent data chunk handler
      res.on('data', (chunk) => buffer.push(Buffer.from(chunk)));
      res.on('end', () => self.handleEnd(res, buffer, callback));

      // handler response errors
      res.on('error', (err) => {
        if (clientRequest !== undefined && typeof clientRequest === 'object') {
          // add request as property of error
          err.request = clientRequest;
          err.response = res;
          // request error handler
          clientRequest.emit('error', err);
        } else {
          // general error handler
          client.emit('error', err);
        }
      });
    });

    // configure request and add it to clientRequest
    // and add it to request returned
    this.configureRequest(request, requestConfig, clientRequest);
    debug('clientRequest', clientRequest);

    clientRequest.setHttpRequest(request);

    debug('options data', options.data);
    // write POST/PUT data to request body;
    // find valid serializer to be used to serialize request data,
    // first one found
    // is the one to be used.if none found for match condition,
    // default serializer is used
    if (options.data) {
      request.write(options.data);
    }
    request.end(); // end request when data is written

    // handle request errors and handle them by request or general
    // error handler
    request.on('error', function(err) {
      if (clientRequest !== undefined && typeof clientRequest === 'object') {
        // add request as property of error
        err.request = clientRequest;

        // request error handler
        clientRequest.emit('error', err);
      } else {
        // general error handler
        client.emit('error', err);
      }
    });
  }
}

// event handlers for client and ConnectManager
util.inherits(nodeRestClient, events.EventEmitter);

const innerDebug = function() {
  if (!process.env.DEBUG) return;

  const now = new Date();
  const header =
    now.getHours() +
    ':' +
    now.getMinutes() +
    ':' +
    now.getSeconds() +
    ' [NRC CLIENT]' +
    innerDebug.caller.name +
    ' -> ';
  const args = Array.prototype.slice.call(arguments);
  args.splice(0, 0, header);
  node_debug.apply(console, args);
};

export default nodeRestClient;
