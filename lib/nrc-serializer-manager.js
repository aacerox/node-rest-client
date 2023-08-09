import XmlSerializer from 'xml2js';

/**
 * request Serializer manager for node-rest-client
 * @date 4/26/2023 - 12:45:40 PM
 *
 * @class SerializerManager
 * @typedef {SerializerManager}
 */
class SerializerManager {
  /**
     * serializers registry
     * @date 4/26/2023 - 12:45:40 PM
     *
     * @type {*}
     */
  #registry = new Map();
  /**
     * default serializer used when no match serializer found for reponse
     * @date 4/26/2023 - 12:45:40 PM
     *
     * @type {*}
     */
  #defaultSerializer;

  /**
     * add serializer to registry
     * @date 4/26/2023 - 12:45:40 PM
     *
     * @param {*} serializer
     */
  add(serializer) {
    if (!this.#validate(serializer)) {
      throw new Error(
          'serializer cannot be added: invalid serializer definition',
      );
    }

    if (serializer.isDefault) {
      this.#defaultSerializer = serializer;
    } else {
      this.#registry.set(serializer.name, serializer);
    }
  }

  /**
     * Remove serializer from registry
     *
     * @param {*} serializerName
     */
  remove(serializerName) {
    this.#checkExists(serializerName);

    this.#registry.delete(serializerName);
  }

  /**
     * Find a serializer in the registry by its name
     *
     * @param {*} serializerName
     * @return {*}
     */
  find(serializerName) {
    this.#checkExists(serializerName);

    return this.#registry.get(serializerName);
  }

  /**
     * Clean the serializers registry
     */
  clean() {
    this.#registry.clear();
  }

  /**
     * Get the serializer that match with the response passed
     * according to its match logic
     *
     * @param {*} request
     * @return {*}
     */
  get(request) {
    const result = Array.from(this.#registry.entries())
        .filter(([key, value]) => value.match(request))
        .map(([key, value]) => value)[0];

    // if parser not found return default parser, else parser found
    return result || this.#defaultSerializer;
  }


  /**
   * Return all available regular serializers
   * @author aacerox
   *
   * @return {*}
   */
  getAll() {
    return Array.from(this.#registry.values());
  }

  /**
     * Description placeholder
     * @date 4/26/2023 - 12:45:40 PM
     *
     * @return {*}
     */
  getDefault() {
    return defaultSerializer;
  }

  /**
     * Description placeholder
     * @date 4/26/2023 - 12:45:40 PM
     *
     * @param {*} serializerName
     */
  #checkExists(serializerName) {
    if (!this.#registry.has(serializerName)) {
      throw new Error(
          `cannot find serializer: ${serializerName} doesn't exists`,
      );
    }
  }

  /**
     * Validate Serializer structure
     *
     * @param {*} serializer
     * @return {boolean}
     */
  #validate(serializer) {
    /**
       * Validate that serializer properties match with expected
       * @author aacerox
       *
       * @param {*} serializer
       * @param {*} props
       * @return {boolean}
       */
    function validateProperties(serializer, props) {
      let result = true;
      // eslint-disable-next-line guard-for-in
      for (const propIndex in props) {
        const propType = props[propIndex].split(':');
        if (
          !serializer.hasOwnProperty([propType[0]]) ||
            typeof serializer[propType[0]] !== propType[1]
        ) {
          result = false;
          break;
        }
      }

      return result;
    }

    let result = validateProperties(serializer, [
      'name:string',
      'serialize:function',
      'isDefault:boolean',
    ]);

    // valid  serializer, check if its not default request serializer,
    // to validate non default serializer props
    if (result && !serializer.isDefault) {
      result = validateProperties(serializer, ['match:function']);
    }

    return result;
  }
}

/**
 * Main Serializer export function where default and common serializers are load
 * @date 4/26/2023 - 12:45:40 PM
 *
 * @export
 * @return {SerializerManager}
 */
const initializeSerializerManager = function() {
  const serializerManager = new SerializerManager();

  // common serializer method and attributes
  const BaseSerializer = {
    isDefault: false,
    match: function(request) {
      let result = false;
      const contentType =
        request.headers['Content-Type'] &&
        request.headers['Content-Type'].replace(/ /g, '');

      if (!contentType) return result;

      for (const element of this.contentTypes) {
        result =
          element.trim().toLowerCase() === contentType.trim().toLowerCase();
        if (result) break;
      }

      return result;
    },
  };

  // add XML serializer
  serializerManager.add(
      Object.assign(
          {
            name: 'XML',
            options: {},
            contentTypes: [
              'application/xml',
              'application/xmlcharset=utf-8',
              'text/xml',
              'text/xmlcharset=utf-8',
            ],
            xmlSerializer: new XmlSerializer.Builder({}),
            serialize: function(data, nrcEventEmitter, serializedCallback) {
              if (typeof data === 'object') {
                data = XmlSerializer.buildObject(data);
              }

              serializedCallback(data);
            },
          },
          BaseSerializer,
      ),
  );

  // add JSON serializer
  serializerManager.add(
      Object.assign(
          {
            name: 'JSON',
            contentTypes: ['application/json', 'application/jsoncharset=utf-8'],
            serialize: function(data, nrcEventEmitter, serializedCallback) {
              if (typeof data === 'object') {
                data = JSON.stringify(data);
              }
              serializedCallback(data);
            },
          },
          BaseSerializer,
      ),
  );

  // add form-encoded serializer
  serializerManager.add(
      Object.assign(
          {
            name: 'FORM-ENCODED',
            contentTypes: [
              'application/x-www-form-urlencoded',
              'multipart/form-data',
              'text/plain',
            ],
            encode: function(obj, parent) {
              const tokens = [];

              // iterate over all properties
              for (const propertyName in obj) {
                // if object has property (it's not an array iteration)
                if (obj.hasOwnProperty(propertyName)) {
                  // if property has parent, add nested reference
                  const parsedProperty = parent ?
                    parent + '[' + propertyName + ']' :
                    propertyName;
                  const propertyValue = obj[propertyName];

                  /**
                   * if property has value and is object (we must iterate again
                   * , not final leaf) iterate over object property passing
                   * current parsed property as parent else add encoded parsed
                   * property and value to result array
                   */
                  tokens.push(
                    (propertyValue !== null &&
                      typeof propertyValue === 'object') ?
                      serialize(propertyValue, parsedProperty) :
                      encodeURIComponent(parsedProperty) +
                          '=' +
                          encodeURIComponent(propertyValue),
                  );
                }
              }
              return tokens.join('&');
            },
            serialize: function(data, nrcEventEmitter, serializedCallback) {
              if (typeof data === 'object') {
                data = this.encode(data);
              }

              serializedCallback(data);
            },
          },
          BaseSerializer,
      ),
  );

  serializerManager.add({
    name: 'DEFAULT',
    isDefault: true,
    serialize: function(data, nrcEventEmitter, serializedCallback) {
      serializedCallback(data.toString());
    },
  });

  return serializerManager;
};

export default initializeSerializerManager;
