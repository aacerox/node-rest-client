/**
 * Description placeholder
 * @author aacerox
 *
 * @export
 * @class NrcConnectManager
 * @typedef {NrcConnectManager}
 */
export class NrcConnectManager {
    /**
     * Creates an instance of NrcConnectManager.
     * @author aacerox
     *
     * @constructor
     * @param {*} client
     * @param {*} parserManager
     * @param {*} usePromises
     */
    constructor(client: any, parserManager: any, usePromises?: any);
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} options
     * @param {*} callback
     */
    proxy(options: any, callback: any): void;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} options
     * @param {*} callback
     */
    normal(options: any, callback: any): void;
    #private;
}
