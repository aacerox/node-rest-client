import XmlSerializer from 'xml2js';

class SerializerManager {
  constructor() {
    let registry = {}; let defaultSerializer = null;

    const _private = {
      'validate': function(serializer) {
        function validateProperties(serializer, props) {
          let result = true;
          for (const propIndex in props) {
            const propType = props[propIndex].split(':');
            if (!serializer.hasOwnProperty([propType[0]]) || typeof serializer[propType[0]] !== propType[1]) {
              result = false;
              break;
            }
          }

          return result;
        }


        let result = validateProperties(serializer, ['name:string', 'serialize:function', 'isDefault:boolean']);

        // valid  serializer, check if its not default request serializer, to validate non
        // default serializer props
        if (result && !serializer.isDefault) {
          result = validateProperties(serializer, ['match:function']);
        };

        return result;
      },
    };

    this.add = function(serializer) {
      if (!_private.validate(serializer)) {
        throw new Error('serializer cannot be added: invalid serializer definition');
      };

      if (serializer.isDefault) {
        defaultSerializer = serializer;
      } else {
        registry[serializer.name] = serializer;
      }
    };

    this.remove = function(serializerName) {
      const result = registry[serializerName];
      if (!result) {
        throw new Error(`cannot remove serializer: ${serializerName} doesn't exists`);
      };

      delete registry[serializerName];
    };

    this.find = function(serializerName) {
      const result = registry[serializerName];
      if (!result) {
        throw new Error(`cannot find serializer: ${serializerName} doesn't exists`);
      };

      return result;
    };


    this.clean = function() {
      registry = {};
    };

    this.get = function(request) {
      let result = null;
      for (const serializerName in registry) {
        if (registry[serializerName].match(request)) {
          result = registry[serializerName];
          break;
        }
      }
      // if serializer not found return default serializer, else serializer found
      return (result === null) ? defaultSerializer : result;
    };

    this.getAll = function() {
      const result = [];
      for (const serializerName in registry) {
        result.push(registry[serializerName]);
      }
      return result;
    };

    this.getDefault = function() {
      return defaultSerializer;
    };
  }
}


export default function() {
  const serializerManager = new SerializerManager();

  const BaseSerializer ={
    'isDefault': false,
    'match': function(request) {
      let result = false;
      const contentType = request.headers['Content-Type'] && request.headers['Content-Type'].replace(/ /g, '');

      if (!contentType) return result;

      for (const element of this.contentTypes) {
        result = element.trim().toLowerCase() === contentType.trim().toLowerCase();
        if (result) break;
      }

      return result;
    },
  };


  // add default serializer managers: JSON,XML and unknown content/type
  serializerManager.add(Object.assign({
    'name': 'XML',
    'options': {},
    'contentTypes': ['application/xml', 'application/xmlcharset=utf-8', 'text/xml', 'text/xmlcharset=utf-8'],
    'xmlSerializer': new XmlSerializer.Builder({}),
    'serialize': function(data, nrcEventEmitter, serializedCallback) {
      if (typeof data === 'object') {
        data = XmlSerializer.buildObject(data);
      };

      serializedCallback(data);
    },
  }, BaseSerializer));

  serializerManager.add(Object.assign({
    'name': 'JSON',
    'contentTypes': ['application/json', 'application/jsoncharset=utf-8'],
    'serialize': function(data, nrcEventEmitter, serializedCallback) {
      if (typeof data === 'object') {
        data = JSON.stringify(data);
      };
      serializedCallback(data);
    },
  }, BaseSerializer));


  serializerManager.add(Object.assign({
    'name': 'FORM-ENCODED',
    'contentTypes': ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'],
    'encode': function(obj, parent) {
      const tokens = [];

      // iterate over all properties
      for (const propertyName in obj) {
        // if object has property (it's not an array iteration)
        if (obj.hasOwnProperty(propertyName)) {
          // if property has parent, add nested reference
          const parsedProperty = parent ? parent + '[' + propertyName + ']' : propertyName; const propertyValue = obj[propertyName];

          // if property has value and is object (we must iterate again, not final leaf)
          // iterate over object property passing current parsed property as parent
          // else add encoded parsed property and value to result array
          tokens.push((propertyValue !== null && typeof propertyValue === 'object') ?
                    serialize(propertyValue, parsedProperty) :
                    encodeURIComponent(parsedProperty) + '=' + encodeURIComponent(propertyValue));
        }
      }
      return tokens.join('&');
    },
    'serialize': function(data, nrcEventEmitter, serializedCallback) {
      if (typeof data === 'object') {
        data = this.encode(data);
      };

      serializedCallback(data);
    	},
  }, BaseSerializer));


  serializerManager.add({
    'name': 'DEFAULT',
    'isDefault': true,
    'serialize': function(data, nrcEventEmitter, serializedCallback) {
      serializedCallback(data.toString());
    },
  });

  return serializerManager;
}
