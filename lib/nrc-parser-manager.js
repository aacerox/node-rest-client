'use strict';

import xmlParser from 'xml2js';

/**
 * node-rest-client parser manager
 *
 * @class ParserManager
 * @typedef {ParserManager}
 */
class ParserManager {
  /**
   * parsers registry
   *
   * @type {Map}
   */
  #registry = new Map();
  /**
   * default parser to be used when no other parser match
   *
   * @type {}
   */
  #defaultParser;

  /**
   * add a new parser
   *
   * @param {*} parser
   */
  add(parser) {
    if (!this.#validate(parser)) {
      throw new Error('parser cannot be added: invalid parser definition');
    }

    if (parser.isDefault) {
      this.#defaultParser = parser;
    } else {
      this.#registry.set(parser.name, parser);
    }
  }

  /**
   * Remove an existing parser
   *
   * @param {*} parserName
   */
  remove(parserName) {
    if (!this.#registry.has(parserName)) {
      throw new Error(`cannot remove parser: ${parserName} doesn't exists`);
    }

    this.#registry.delete(parserName);
  }

  /**
   * Clean all parsers from registry
   */
  clean() {
    this.#registry.clear();
  }

  /**
   * Find a parser in the registry by its name
   *
   * @param {String} parserName
   * @return {Parser}
   */
  find(parserName) {
    const result = this.#registry.get(parserName);
    if (!result) {
      throw new Error(`cannot find parser: ${parserName} doesn't exists`);
    }

    return result;
  }

  /**
   * Returns default parser
   *
   * @return {*}
   */
  getDefault() {
    return this.#defaultParser;
  }

  /**
   * Get the parser that match with the response passed
   * according to its match logic
   *
   * @param {*} response
   * @return {*}
   */
  get(response) {
    const result = Array.from(this.#registry.entries())
        .filter(([key, value]) => value.match(response))
        .map(([key, value]) => value)[0];

    // if parser not found return default parser, else parser found
    return result || this.#defaultParser;
  }

  /**
   * Returns all parsers available in the registry (excluding default)
   *
   * @return {*}
   */
  getAll() {
    return Array.from(this.#registry.values());
  }

  /**
   * Validate parser structure
   *
   * @param {*} parser
   * @return {boolean}
   */
  #validate(parser) {
    /**
     * Validate that parser properties match with expected
     *
     * @param {*} parser
     * @param {*} props
     * @return {boolean}
     */
    function validateProperties(parser, props) {
      let result = true;
      // eslint-disable-next-line guard-for-in
      for (const propIndex in props) {
        const propType = props[propIndex].split(':');
        if (
          !parser.hasOwnProperty([propType[0]]) ||
          typeof parser[propType[0]] !== propType[1]
        ) {
          result = false;
          break;
        }
      }

      return result;
    }

    let result = validateProperties(parser, [
      'name:string',
      'parse:function',
      'isDefault:boolean',
    ]);

    // valid  parser, check if its not default response parser, to validate non
    // default parser props
    if (result && !parser.isDefault) {
      result = validateProperties(parser, ['match:function']);
    }

    return result;
  }
}

/**
 * Main parser manager function where the default and common parsers are load
 * @date 4/25/2023 - 10:53:15 PM
 *
 * @export
 * @return {ParserManager}
 */
export default function() {
  const parserManager = new ParserManager();

  // common parser method and attributes
  const BaseParser = {
    isDefault: false,
    match: function(response) {
      let result = false;
      const contentType =
          response.headers['content-type'] &&
          response.headers['content-type'].replace(/ /g, '');

      if (!contentType) return result;

      for (const element of this.contentTypes) {
        result =
          element.trim().toLowerCase() === contentType.trim().toLowerCase();
        if (result) break;
      }

      return result;
    },
  };

  // add default XML parser
  parserManager.add(
      Object.assign(
          {
            name: 'XML',
            options: {explicitArray: false},
            contentTypes: [
              'application/xml',
              'application/xml;charset=utf-8',
              'text/xml',
              'text/xml;charset=utf-8',
            ],
            parseString: xmlParser.parseString,
            parse: function(byteBuffer, nrcEventEmitter, parsedCallback) {
              this.parseString(
                  byteBuffer.toString(),
                  this.options,
                  function(err, result) {
                    parsedCallback(result);
                  },
              );
            },
          },
          BaseParser,
      ),
  );

  // add default json parser
  parserManager.add(
      Object.assign(
          {
            name: 'JSON',
            // eslint-disable-next-line max-len
            contentTypes: [
              'application/json',
              'application/json;charset=utf-8',
              'application/jsoncharset=utf-8',
            ],
            isValidData: (data) => {
              return (
              // eslint-disable-next-line max-len
                data !== undefined && data.length !== undefined && data.length > 0
              );
            },
            parse: function(byteBuffer, nrcEventEmitter, parsedCallback) {
              let jsonData;
              const data = byteBuffer.toString();

              try {
                jsonData = this.isValidData(data) ? JSON.parse(data) : data;
              } catch (err) {
                // Something went wrong when parsing json. This can happen
                // for many reasons, including a bad implementation on the
                // server.
                nrcEventEmitter(
                    'error',
                    // eslint-disable-next-line max-len
                    `Error parsing response. response: [${data}], error: [${err}]`,
                );
              }
              parsedCallback(jsonData);
            },
          },
          BaseParser,
      ),
  );

  parserManager.add({
    name: 'DEFAULT',
    isDefault: true,
    parse: (byteBuffer, nrcEventEmitter, parsedCallback) =>
      parsedCallback(byteBuffer),
  });

  return parserManager;
}
