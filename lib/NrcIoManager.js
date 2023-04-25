'use strict';

import urlParser from 'url';
import NrcClientRequest from './NrcClientRequest.js';
import events from 'events';
import debug from './NrcDebugger.js';

// declare ioManager constants
const CONSTANTS = {
  HEADER_CONTENT_LENGTH: 'Content-Length',
};

/**
 * Manage the creation and configuration of HTTP methods
 * @author aacerox
 *
 * @export
 * @class NrcIoManager
 * @typedef {NrcIoManager}
 */
export default class NrcIoManager extends events.EventEmitter {
  /**
   * nrc connect manager instance
   * @date 8/9/2023 - 5:46:33 PM
   *
   * @type {*}
   */
  #connectManager;

  /**
   * nrc instance
   * @author aacerox
   *
   * @type {*}
   */
  #client;

  /**
   * nrc instance request serializers
   * @date 8/9/2023 - 5:47:16 PM
   *
   * @type {*}
   */
  #serializerManager;

  /**
   * nrc instance response parsers
   * @date 8/9/2023 - 5:47:20 PM
   *
   * @type {*}
   */
  #parserManager;

  /**
   * Creates an instance of NrcIoManager.
   * @author aacerox
   *
   * @constructor
   * @param {*} client
   * @param {*} connectManager
   * @param {*} serializerManager
   * @param {*} parserManager
   */
  constructor(client, connectManager, serializerManager, parserManager) {
    super();
    this.#client = client;
    this.#connectManager = connectManager;
    this.#serializerManager = serializerManager;
    this.#parserManager = parserManager;
  }

  /**
   * create an HTTP method by using promises or function callbacks
   * @author aacerox
   *
   * @param {*} methodName
   * @param {*} config
   * @param {*} usePromises
   * @return {*}
   */
  createHttpMethod(methodName, config, usePromises) {
    const self = this;
    if (usePromises) {
      return (url, args) =>
        new Promise((successFn, errorFn) => {
          try {
            const clientRequest = new NrcClientRequest();
            self.#connect(
                config,
                methodName.toUpperCase(),
                url,
                args,
                successFn,
                clientRequest,
            );
            return clientRequest;
          } catch (err) {
            errorFn(err);
          }
        });
    } else {
      return (url, args, callback) => {
        const clientRequest = new NrcClientRequest();
        self.#connect(
            config,
            methodName.toUpperCase(),
            url,
            args,
            callback,
            clientRequest,
        );
        return clientRequest;
      };
    }
  }

  /**
   * add passed mimetypes to response parsers
   * @author aacerox
   *
   * @param {*} mimetypes
   * @deprecated
   */
  mergeMimeTypes(mimetypes) {
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
          parser = this.#parserManager.find('JSON');
          parser.contentTypes = mimetypes.json;
        } else if (
          mimetypes.xml &&
          mimetypes.xml instanceof Array &&
          mimetypes.xml.length > 0
        ) {
          parser = this.#parserManager.find('XML');
          parser.contentTypes = mimetypes.xml;
        }
      } catch (err) {
        this.#client.emit(
            'error',
            `cannot assign custom content types to parser, cause: ${err}`,
        );
      }
    }
  }

  /**
   * Add default HTTPS port to host if not present
   * @author aacerox
   *
   * @param {*} url
   * @return {*}
   */
  #createProxyPath(url) {
    let result = url.host;
    // check url protocol to set path in request options
    if (url.protocol === 'https:') {
      // port is set, leave it, otherwise use default https 443
      result = url.host.indexOf(':') == -1 ? url.hostname + ':443' : url.host;
    }
    return result;
  }

  /**
   * create proxy security and port-forwarding headers
   * @author aacerox
   *
   * @param {*} config
   * @param {*} url
   * @return {Array}
   */
  #createProxyHeaders(config, url) {
    const result = {};
    // if proxy requires authentication, create Proxy-Authorization headers
    if (config.proxy.user && config.proxy.password) {
      result['Proxy-Authorization'] =
        'Basic ' +
        Buffer.from(
            [config.proxy.user, self.proxy.password].join(':'),
        ).toString('base64');
    }
    // no tunnel proxy connection, we add the host to the headers
    if (!config.useProxyTunnel) {
      result['host'] = url.host;
    }

    return result;
  }

  /**
   * Create connection options for passed HTTP method
   * according nrc global or method config
   * @author aacerox
   *
   * @param {*} config
   * @param {*} connectURL
   * @param {*} connectMethod
   * @return { ConnectOptions}
   */
  #createConnectOptions(config, connectURL, connectMethod) {
    debug('connect URL = ', connectURL);
    const url = urlParser.parse(connectURL);
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

    if (config.useProxy) result.agent = false; // cannot use default
    // agent in proxy mode

    if (config.options.user && config.options.password) {
      result.auth = [config.options.user, config.options.password].join(':');
    } else if (config.options.user && !config.options.password) {
      // some sites only needs user with no password to
      // authenticate
      result.auth = config.options.user + ':';
    }

    // configure proxy connection to establish a tunnel
    if (config.useProxy) {
      result.proxy = {
        host: config.proxy.host,
        port: config.proxy.port,
        // if proxy tunnel use 'CONNECT' method, else get method from request
        method: config.useProxyTunnel ? 'CONNECT' : connectMethod,
        // if proxy tunnel set proxy path else get request path
        path: config.useProxyTunnel ? this.#createProxyPath(url) : connectURL,
        // createProxyHeaders add correct headers depending of
        // proxy connection type
        headers: this.#createProxyHeaders(url),
      };
    }

    if (
      config.options.connection &&
      typeof config.options.connection === 'object'
    ) {
      // eslint-disable-next-line guard-for-in
      for (const option in config.options.connection) {
        result[option] = config.options.connection[option];
      }
    }

    // don't use tunnel to connect to proxy, direct request
    // and delete proxy options
    if (!config.useProxyTunnel) {
      // eslint-disable-next-line guard-for-in
      for (const proxyOption in result.proxy) {
        result[proxyOption] = result.proxy[proxyOption];
      }

      delete result.proxy;
    }

    // add general request and response config to connect options

    result.requestConfig = config.options.requestConfig || {};
    result.responseConfig = config.options.responseConfig || {};

    return result;
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} connectURL
   * @return {{}}
   */
  #decodeQueryFromURL(connectURL) {
    const url = new URL(connectURL);
    const query = url.query.substring(1).split('&');
    let keyValue;
    const result = {};

    // create decoded args from key value elements in query+
    for (const element of query) {
      keyValue = element.split('=');
      result[keyValue[0]] = decodeURIComponent(keyValue[1]);
    }

    return result;
  }
  /**
   * Description placeholder
   * @author aacerox
   */
  /**
   * Description placeholder
   * @author aacerox
   */
  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} args
   * @return {*}
   */
  #serializeEncodeQueryFromArgs(args) {
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} obj
     * @param {*} parent
     * @return {*}
     */
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
      this.#client.emit(
          'error',
          // eslint-disable-next-line max-len
          `cannot serialize parameters: invalid type ${typeof args} should be an object type`,
      );
    }

    return serialize(args);
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} args
   * @param {*} url
   * @return {*}
   */
  #parsePathParameters(args, url) {
    let result = url;
    if (!args?.path) return url;

    // eslint-disable-next-line guard-for-in
    for (const placeholder in args.path) {
      const regex = new RegExp('\\$\\{' + placeholder + '\\}', 'i');
      result = result.replace(regex, args.path[placeholder]);
    }

    return result;
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} connectOptions
   * @param {*} methodOptions
   */
  #overrideClientConfig(connectOptions, methodOptions) {
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} reqResOption
     * @return {boolean}
     */
    function validateReqResOptions(reqResOption) {
      return reqResOption && typeof reqResOption === 'object';
    }
    // check if we have particular request or response config set on
    // this method invocation
    // and override general request/response config
    if (validateReqResOptions(methodOptions.requestConfig)) {
      Object.assign(connectOptions.requestConfig, methodOptions.requestConfig);
    }

    if (validateReqResOptions(methodOptions.responseConfig)) {
      Object.assign(
          connectOptions.responseConfig,
          methodOptions.responseConfig,
      );
    }
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} config
   * @param {*} method
   * @param {*} url
   * @param {*} args
   * @param {*} callback
   * @param {*} clientRequest
   */
  #connect(config, method, url, args, callback, clientRequest) {
    // wrapper for emit function on client
    const clientEventEmitter = function(client) {
      return function(type, event) {
        client.emit(type, event);
      };
    };

    // check args type if we use it
    if (callback && args && typeof args !== 'object') {
      this.#client.emit('error', 'args should be and object');
    }

    // configure connect options based on url parameter parse
    const options = this.#createConnectOptions(
        config,
        this.#parsePathParameters(args, url),
        method,
    );
    debug('options pre connect', options);

    options.method = method;
    options.clientRequest = clientRequest;
    options.headers = options.headers || {};

    clientRequest.href = options.href;

    debug('args = ', args);
    debug('args.data = ', args !== undefined ? args.data : undefined);
    // no args passed
    if (typeof args === 'function') {
      callback = args;
      // add Content-length to POST/PUT/DELETE/PATCH methods
      if (method !== 'GET') {
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
          this.#client.emit(
              'error',
              // eslint-disable-next-line max-len
              `parameters argument cannot be used if parameters are already defined in URL ${options.path}`,
          );
        }

        options.path += options.path.charAt(pathLength - 1) === '?' ? '' : '?';
        // check if we have serializable parameter container, that
        // must be serialized and encoded
        // directly, as javascript object
        options.path = options.path.concat(
            this.#serializeEncodeQueryFromArgs(args.parameters),
        );
        debug('options.path after request parameters = ', options.path);
      }

      // override client config, by the moment just for request
      // response config
      this.#overrideClientConfig(options, args);

      // always set Content-length header if not set previously
      // set Content length for some servers to work (nginx, apache)
      if (
        args.data !== undefined &&
        !options.headers.hasOwnProperty(CONSTANTS.HEADER_CONTENT_LENGTH)
      ) {
        this.#serializerManager
            .get(options)
            .serialize(
                args.data,
                clientEventEmitter(this.#client),
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
    debug('FINAL client object  ====>', config);

    if (config.useProxy && config.useProxyTunnel) {
      this.#connectManager.proxy(options, callback);
    } else {
      // normal connection and direct proxy connections (no tunneling)
      this.#connectManager.normal(options, callback);
    }
  }
}
