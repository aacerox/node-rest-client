'use strict';


import NrcIoManager from './NrcIoManager.js';
import initializeParserManager from './nrc-parser-manager.js';
import initializeSerializerManager from './nrc-serializer-manager.js';
import {NrcConnectManager} from './NrcConnectManager.js';
import events from 'events';
import debug from './NrcDebugger.js';


/**
 * Main node-rest-client component
 * @author aacerox
 *
 * @export
 * @class NodeRestClient
 * @typedef {NodeRestClient}
 */
export default class NodeRestClient extends events.EventEmitter {
  /**
   * nrc config
   * @author aacerox
   *
   * @type {options}
   */
  #config = {};
  /**
   * nrc parsers and serializers facade
   * @author aacerox
   *
   * @type {*}
   */
  #ioManager;

  #apis = {};

  /**
   * method registry
   * @author aacerox
   *
   * @type {{}}
   */
  #methods = {};

  /**
   * parsers registry
   * @author aacerox
   *
   * @type {{}}
   */
  #parsers = {};

  /**
   * serializers registry
   * @author aacerox
   *
   * @type {{}}
   */
  #serializers = {};

  /**
   * private GET HTTP method where callback
   * and promise logic are managed
   * @author aacerox
   *
   * @type {*}
   */
  #get;

  /**
   * private POST HTTP method where callback
   * and promise logic are managed
   * @author aacerox
   *
   * @type {*}
   */
  #post;

  /**
   * private PUT HTTP method where callback
   * and promise logic are managed
   * @author aacerox
   *
   * @type {*}
   */
  #put;

  /**
   * private DELETE HTTP method where callback
   * and promise logic are managed
   * @author aacerox
   *
   * @type {*}
   */
  #delete;

  /**
   * private PATCH HTTP method where callback
   * and promise logic are managed
   * @author aacerox
   *
   * @type {*}
   */
  #patch;

  #usePromises;
  /**
   * Creates a NodeRestClient instance.
   * @author aacerox
   *
   * @constructor
   * @param {options} options to initialize client
   * @param {usePromises} usePromises if true nrc will use promises
   * instead of callbacks
   */
  constructor(
      options = {
        usePromises: false,
        connection: {},
        mimetypes: {},
        requestConfig: {},
        responseConfig: {},
      },
  ) {
    super();
    const useProxy = !!options.proxy;
    const useProxyTunnel =
      !useProxy || options.proxy.tunnel === undefined ?
        false :
        options.proxy.tunnel;

    this.#config = {
      useProxy: useProxy,
      useProxyTunnel: useProxyTunnel,
      options: options,
    };
    this.#usePromises = options.usePromises;
    this.#initialize();
  }

  /**
   * main initialization method where HTTP methods parsers and serializers
   * are initialized
   * @author aacerox
   */
  #initialize() {
    // parser response manager
    const parserManager = initializeParserManager();
    // serializer request
    const serializerManager = initializeSerializerManager();

    const connectManager = new NrcConnectManager(
        this,
        parserManager,
        this.#usePromises,
    );
    // io facade to parsers and serializers
    const ioFacade = this.#createIOFacade(parserManager, serializerManager);

    // initialize parser/serializer with io facade
    this.#parsers = ioFacade.parsers;
    this.#serializers = ioFacade.serializers;
    debug('NrcConnectManager', connectManager);

    this.#ioManager = new NrcIoManager(
        this,
        connectManager,
        serializerManager,
        parserManager,
    );
    // initialize default http methods
    this.#get = this.#ioManager.createHttpMethod(
        'get',
        this.#config,
        this.#usePromises,
    );
    this.#post = this.#ioManager.createHttpMethod(
        'post',
        this.#config,
        this.#usePromises,
    );
    this.#put = this.#ioManager.createHttpMethod(
        'put',
        this.#config,
        this.#usePromises,
    );
    this.#delete = this.#ioManager.createHttpMethod(
        'delete',
        this.#config,
        this.#usePromises,
    );
    this.#patch = this.#ioManager.createHttpMethod(
        'patch',
        this.#config,
        this.#usePromises,
    );

    // merge mime types with connect manager
    this.#ioManager.mergeMimeTypes(this.#config.options.mimetypes);
  }

  /**
   * returns the GET HTTP method wrapper
   * @author aacerox
   *
   * @readonly
   * @type {*}
   */
  get get() {
    return this.#get;
  }

  /**
   * returns the POST HTTP method wrapper
   * @author aacerox
   *
   * @readonly
   * @type {*}
   */
  get post() {
    return this.#post;
  }

  /**
   * returns the PUT HTTP method wrapper
   * @author aacerox
   *
   * @readonly
   * @type {*}
   */
  get put() {
    return this.#put;
  }

  /**
   * returns the DELETE HTTP method wrapper
   * @author aacerox
   *
   * @readonly
   * @type {*}
   */
  get delete() {
    return this.#delete;
  }

  /**
   * returns the PATCH HTTP method wrapper
   * @author aacerox
   *
   * @readonly
   * @type {*}
   */
  get patch() {
    return this.#patch;
  }

  /**
   * return all the nrc configured response parsers
   * @author aacerox
   *
   * @readonly
   * @type {{}}
   */
  get parsers() {
    return this.#parsers;
  }

  /**
   * returns all the nrc configured request serializers
   * @author aacerox
   *
   * @readonly
   * @type {{}}
   */
  get serializers() {
    return this.#serializers;
  }

  /**
   * returns all nrc registered methods
   * @author aacerox
   *
   * @readonly
   * @type {{}}
   */
  get methods() {
    return this.#methods;
  }

  /**
   * add a new custom method to the method registry
   * @author aacerox
   *
   * @param {*} name
   * @param {*} url
   * @param {*} method
   */
  registerMethod(name, url, method) {
    // create method in method registry with pre-configured REST invocation
    // method
    this.#methods[name] = this.#usePromises ?
      this.#getHttpPromiseFn(url, method) :
      this.#getHttpCallbackFn(url, method);
  }

  /**
   * unregister previously registered method
   * @author aacerox
   *
   * @param {*} name
   */
  unregisterMethod(name) {
    delete this.methods[name];
  }

  /**
   * returns a new HTTP method callback function
   * @author aacerox
   *
   * @param {*} url
   * @param {*} method
   * @return { HttpMethodFunction}
   */
  #getHttpCallbackFn(url, method) {
    const httpMethod = this[method.toLowerCase()];

    return (args = {}, callback) => {
      return httpMethod(url, args, callback);
    };
  }

  /**
   * returns a new HTTP method promise
   * @author aacerox
   *
   * @param {*} url
   * @param {*} method
   * @return { promise}
   */
  #getHttpPromiseFn(url, method) {
    const httpMethod = this[method.toLowerCase()];

    return (args = {}, callback) =>
      new Promise((successFn, errorFn) => {
        try {
          successFn(httpMethod(url, args, callback));
        } catch (err) {
          errorFn(err);
        }
      });
  }

  /**
   * returns a new IOFacade object to access response parsers
   * and request serializers
   * @author aacerox
   *
   * @param {*} parserManager
   * @param {*} serializerManager
   * @return { IOFacade }
   */
  #createIOFacade(parserManager, serializerManager) {
    const self = this;
    return (function(parserManager, serializerManager) {
      // error execution context
      const errorContext = (parserFn) =>
        function(...args) {
          try {
            // eslint-disable-next-line no-invalid-this
            return parserFn.apply(this, args);
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

      result.parsers.find = errorContext(parserManager.find).bind(
          parserManager,
      );

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
  }
};
