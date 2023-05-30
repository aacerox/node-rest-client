/**
 * Description placeholder
 * @author aacerox
 *
 * @export
 * @class NodeRestClient
 * @typedef {NodeRestClient}
 */
export default class NodeRestClient {
    /**
     * Creates an instance of NodeRestClient.
     * @author aacerox
     *
     * @constructor
     * @param {options} options to initialize client
     * @param {usePromises} usePromises instead of callbacks
     */
    constructor(options?: any);
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {*}
     */
    readonly get get(): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {*}
     */
    readonly get post(): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {*}
     */
    readonly get put(): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {*}
     */
    readonly get delete(): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {*}
     */
    readonly get patch(): any;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {{}}
     */
    readonly get parsers(): {};
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {{}}
     */
    readonly get serializers(): {};
    /**
     * Description placeholder
     * @author aacerox
     *
     * @readonly
     * @type {{}}
     */
    readonly get methods(): {};
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} name
     * @param {*} url
     * @param {*} method
     */
    registerMethod(name: any, url: any, method: any): void;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} name
     */
    unregisterMethod(name: any): void;
    #private;
}
/**
 * Description placeholder
 */
export type NodeRestClient = NodeRestClient;
