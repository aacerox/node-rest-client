'use strict';
import followRedirect from 'follow-redirects';
import zlib from 'zlib';
import debug from './NrcDebugger.js';
import stream from 'stream';


const {http, https} = followRedirect;

/**
 * Manage proxy and non-proxy underlying connections
 * @author aacerox
 *
 * @export
 * @class NrcConnectManager
 * @typedef {NrcConnectManager}
 */
export class NrcConnectManager {
  /**
   * response parser manager
   * @author aacerox
   *
   * @type {*}
   */
  #parserManager;
  /**
   * nrc instance managed by connect manager
   * @author aacerox
   *
   * @type {*}
   */
  #client;

  /**
   * if true the manager will manage HTTP methods using promises
   * if false will manage HTTP methods with function callbacks
   *
   * By default is false
   *
   * @date 8/9/2023 - 5:30:01 PM
   *
   * @type {*}
   */
  #usePromises;

  /**
   * Creates an instance of NrcConnectManager.
   * @author aacerox
   *
   * @constructor
   * @param {*} client
   * @param {*} parserManager
   * @param {*} usePromises
   */
  constructor(client, parserManager, usePromises = false) {
    this.#parserManager = parserManager;
    this.#client = client;
    this.#usePromises = usePromises;
  }

  /**
   * connect using configured proxy
   * @author aacerox
   *
   * @param {*} options
   * @param {*} callback
   */
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

      self.#configureOptions(options);

      // add request options to request returned to calling method
      clientRequest.options = options;

      // configure proxy request
      const request = protocol.request(options, (res) => {
        // configure response
        self.#configureResponse(res, responseConfig, clientRequest);

        // concurrent data chunk handler
        res.on('data', (chunk) => buffer.push(Buffer.from(chunk)));
        res.on('end', () => this.#handleEnd(res, buffer, callback));

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
      self.#configureRequest(request, requestConfig, clientRequest);
      clientRequest.setHttpRequest(request);

      self.#writeRequest(options.data, request);

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

  /**
   * direct connection to target  (do not use proxy)
   * @author aacerox
   *
   * @param {*} options
   * @param {*} callback
   */
  normal(options, callback) {
    const buffer = [];
    const protocol = options.protocol === 'http' ? http : https;
    const clientRequest = options.clientRequest;
    const requestConfig = options.requestConfig;
    const responseConfig = options.responseConfig;
    const self = this;

    this.#configureOptions(options);

    // add request options to request returned to calling method
    clientRequest.options = options;

    const request = protocol.request(options, function(res) {
      // configure response
      self.#configureResponse(res, responseConfig, clientRequest);

      // concurrent data chunk handler
      res.on('data', (chunk) => buffer.push(Buffer.from(chunk)));
      res.on('end', () => self.#handleEnd(res, buffer, callback));

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
    this.#configureRequest(request, requestConfig, clientRequest);
    debug('clientRequest', clientRequest);

    clientRequest.setHttpRequest(request);

    debug('options data', options.data);


    this.#writeRequest(options.data, request);

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


  /**
     * Description placeholder
     * @date 10/19/2023 - 7:06:36 PM
     *
     * @param {*} data
     * @param {*} request
     */
  #writeRequest(data, request) {
    if (data) {
      if (data instanceof stream) {
        // close request when stream ends
        data.pipe(request);
        data.on('end', ()=>{
          request.end();
          data.close();
        });
      } else {
        // write POST/PUT data to request body;
        // find valid serializer to be used to serialize request data,
        // first one found
        // is the one to be used.if none found for match condition,
        // default serializer is used
        request.write(data);
        request.end();
      }
    } else {
      // no data, end request
      request.end();
    }
  }

  /**
   * prepare request using global or method config
   * @author aacerox
   *
   * @param {*} req
   * @param {*} config
   * @param {*} clientRequest
   */
  #configureRequest(req, config, clientRequest) {
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

  /**
   * prepare response using global or method config
   * @author aacerox
   *
   * @param {*} res
   * @param {*} config
   * @param {*} clientRequest
   */
  #configureResponse(res, config, clientRequest) {
    if (config.timeout) {
      res.setTimeout(config.timeout, () => {
        clientRequest.emit('responseTimeout', res);
        res.close();
      });
    }
  }

  /**
   * configure connect manager according to passed options
   * @author aacerox
   *
   * @param {*} options
   */
  #configureOptions(options) {
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

  /**
   * handle requests
   * @author aacerox
   *
   * @param {*} res
   * @param {*} buffer
   * @param {*} callback
   */
  #handleEnd(res, buffer, callback) {
    const content = res.headers['content-type'];
    const encoding = res.headers['content-encoding'];

    debug('content-type: ', content);
    debug('content-encoding: ', encoding);

    if (encoding !== undefined && encoding.indexOf('gzip') >= 0) {
      debug('gunzip');
      zlib.gunzip(Buffer.concat(buffer), (er, gunzipped) => {
        this.#handleResponse(res, gunzipped, callback);
      });
    } else if (encoding !== undefined && encoding.indexOf('deflate') >= 0) {
      debug('inflate');
      zlib.inflate(Buffer.concat(buffer), (er, inflated) =>
        this.#handleResponse(res, inflated, callback),
      );
    } else {
      debug('not compressed');
      this.#handleResponse(res, Buffer.concat(buffer), callback);
    }
  }

  /**
   * handle responses
   * @author aacerox
   *
   * @param {*} res
   * @param {*} data
   * @param {*} callback
   */
  #handleResponse(res, data, callback) {
    // find valid parser to be used with response content type, first one
    // found
    const parserCallbackFn = this.#usePromises ?
      (parsedData) => callback({data: parsedData, response: res}) :
      (parsedData) => callback(parsedData, res);

    this.#parserManager
        .get(res)
        .parse(data,
            this.#clientEmitterWrapper(this.#client), parserCallbackFn);
  }

  /**
   * client event emitter wrapper
   * @author aacerox
   *
   * @param {*} client
   * @return {*}
   */
  #clientEmitterWrapper(client) {
    return (type, event) => client.emit(type, event);
  }

  /**
   * prepare write HTTP method data
   * @author aacerox
   *
   * @param {*} data
   * @return {*}
   */
  #prepareData(data) {
    let result;
    if (data instanceof Buffer || typeof data !== 'object') {
      result = data;
    } else {
      result = JSON.stringify(data);
    }
    return result;
  }
}
