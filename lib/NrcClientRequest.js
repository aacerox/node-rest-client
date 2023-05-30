import events from 'events';


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
export default class ClientRequest extends events.EventEmitter {
  /**
   * Creates an instance of ClientRequest.
   * @author aacerox
   *
   * @constructor
   */
  constructor() {
    super();
  }
  /**
   * Description placeholder
   * @author aacerox
   */
  end() {
    if (this._httpRequest) {
      this._httpRequest.end();
    }
  }
  /**
   * Description placeholder
   * @author aacerox
   *
   * @param {*} req
   */
  setHttpRequest(req) {
    this._httpRequest = req;
  }
}
