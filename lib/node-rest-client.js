'use strict';


import NrcUtil from './NrcUtil.js';
import initializeParserManager from './nrc-parser-manager.js';
import initializeSerializerManager from './nrc-serializer-manager.js';
import debug from 'debug';
import {ConnectManager} from './ConnectManager.js';
import events from 'events';

/**
 * Description placeholder
 * @author aacerox
 *
 * @type {*}
 */
const nodeDebug = debug('NRC');

/**
 * Description placeholder
 * @author aacerox
 *
 * @param {...{}} args
 */
const InnerDebug = function(...args) {
  if (!process.env.DEBUG) return;

  const now = new Date();
  const header =
    now.getHours() +
    ':' +
    now.getMinutes() +
    ':' +
    now.getSeconds() +
    ' [NRC CLIENT]' +
    this.caller.name +
    ' -> ';
  const innerArgs = Array.prototype.slice.call(args);
  args.splice(0, 0, header);
  nodeDebug.apply(console, innerArgs);
};

/**
 * Description placeholder
 * @author aacerox
 *
 * @export
 * @class NodeRestClient
 * @typedef {NodeRestClient}
 */
export default class NodeRestClient extends events.EventEmitter {
  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} client
   * @param {*} url
   * @param {*} method
   * @return {method }
   */
  static #Method = function(client, url, method) {
    const httpMethod = client[method.toLowerCase()];

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

  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {options}
   */
  #config= {};
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  #util;

  // public namespaces
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {{}}
   */
  parsers = {};
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {{}}
   */
  methods = {};
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {{}}
   */
  serializers = {};

  // default http methods
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  get;
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  post;
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  put;
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  delete;
  /**
   * Description placeholder
   * @author aacerox
   *
   * @type {*}
   */
  patch;

  /**
   * Creates an instance of NodeRestClient.
   * @author aacerox
   *
   * @constructor
   * @param {options} options to initialize client
   */
  constructor(
      options = {
        connection: {},
        mimetypes: {},
        requestConfig: {},
        responseConfig: {},
      },
  ) {
    super();
    const useProxy = (options.proxy? true : false);
    const useProxyTunnel = (!useProxy || options.proxy.tunnel === undefined ?
          false :
          options.proxy.tunnel);

    this.#config = {
      useProxy: useProxy,
      useProxyTunnel: useProxyTunnel,
      options: options,
    };
    this.#initialize();
  }

  /**
   * Description placeholder
   * @author aacerox
   */
  #initialize() {
    // parser response manager
    const parserManager = initializeParserManager();
    // serializer request
    const serializerManager = initializeSerializerManager();

    const connectManager = new ConnectManager(this, parserManager);
    // io facade to parsers and serializers
    const ioFacade = this.#createIOFacade(parserManager, serializerManager);

    // initialize parser/seralizer with io facade
    this.parsers = ioFacade.parsers;
    this.serializers = ioFacade.serializers;
    debug('ConnectManager', connectManager);

    this.#util = new NrcUtil(this, connectManager,
        serializerManager, parserManager);
    // initialize default http methods
    this.get = this.#util.createHttpMethod('get', this.#config);
    this.post = this.#util.createHttpMethod('post', this.#config);
    this.put = this.#util.createHttpMethod('put', this.#config);
    this.delete = this.#util.createHttpMethod('delete', this.#config);
    this.patch = this.#util.createHttpMethod('patch', this.#config);

    // merge mime types with connect manager
    this.#util.mergeMimeTypes(this.#config.options.mimetypes);
  }

  /**
   * Description placeholder
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

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} name
   * @param {*} url
   * @param {*} method
   */
  registerMethod(name, url, method) {
    // create method in method registry with preconfigured REST invocation
    // method
    this.methods[name] = new NodeRestClient.#Method(this, url, method);
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} name
   */
  unregisterMethod(name) {
    delete this.methods[name];
  }

  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} methodName
   */
  addCustomHttpMethod(methodName) {
    self[methodName.toLowerCase()] = util.createHttpMethod(methodName);
  }
};
