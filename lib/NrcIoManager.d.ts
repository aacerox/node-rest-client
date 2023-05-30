/**
 * Description placeholder
 * @author aacerox
 *
 * @export
 * @class NrcIoManager
 * @typedef {NrcIoManager}
 */
export default class NrcIoManager {
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
    constructor(client: any, connectManager: any, serializerManager: any, parserManager: any);
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} methodName
     * @param {*} config
     * @param {*} usePromises
     * @return {*}
     */
    createHttpMethod(methodName: any, config: any, usePromises: any): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} mimetypes
     */
    mergeMimeTypes(mimetypes: any): void;
    #private;
}
/**
 * Description placeholder
 */
export type NrcIoManager = NrcIoManager;
