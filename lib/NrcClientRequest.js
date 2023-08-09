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
   * finalize current http request
   * @author aacerox
   */
  end() {
    if (this._httpRequest) {
      this._httpRequest.end();
    }
  }
  /**
   * set new http request
   * @author aacerox
   *
   * @param {*} req
   */
  setHttpRequest(req) {
    this._httpRequest = req;
  }
}
