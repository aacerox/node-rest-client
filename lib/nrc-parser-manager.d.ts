export default initializeParserManager;
/**
 * Main parser manager function where the default and common parsers are load
 * @date 4/25/2023 - 10:53:15 PM
 *
 * @export
 * @return {ParserManager}
 */
declare function initializeParserManager(): ParserManager;
/**
 * node-rest-client parser manager
 *
 * @class ParserManager
 * @typedef {ParserManager}
 */
declare class ParserManager {
    /**
     * add a new parser
     *
     * @param {*} parser
     */
    add(parser: any): void;
    /**
     * Remove an existing parser
     *
     * @param {*} parserName
     */
    remove(parserName: any): void;
    /**
     * Clean all parsers from registry
     */
    clean(): void;
    /**
     * Find a parser in the registry by its name
     *
     * @param {String} parserName
     * @return {Parser}
     */
    find(parserName: string): Parser;
    /**
     * Returns default parser
     *
     * @return {*}
     */
    getDefault(): any;
    /**
     * Get the parser that match with the response passed
     * according to its match logic
     *
     * @param {*} response
     * @return {*}
     */
    get(response: any): any;
    /**
     * Returns all parsers available in the registry (excluding default)
     *
     * @return {*}
     */
    getAll(): any;
    #private;
}
