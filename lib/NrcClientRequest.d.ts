/**
 * Client Request to be passed to NrcConnectManager and returned
 * for each REST method invocation
 * @author aacerox
 *
 * @export
 * @class ClientRequest
 * @typedef {ClientRequest}
 * @extends {events.EventEmitter}
 */
export default class ClientRequest {
    /**
     * Description placeholder
     * @author aacerox
     */
    end(): void;
    /**
     * Description placeholder
     * @author aacerox
     *
     * @param {*} req
     */
    setHttpRequest(req: any): void;
    _httpRequest: any;
}
/**
 * Client Request to be passed to NrcConnectManager and returned
 * for each REST method invocation
 */
export type ClientRequest = ClientRequest;
