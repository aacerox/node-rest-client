import events from 'events';

// Client Request to be passed to ConnectManager and returned
// for each REST method invocation
export default class ClientRequest extends events.EventEmitter {
  constructor() {
    super();
  }
  end() {
    if (this._httpRequest) {
      this._httpRequest.end();
    }
  }
  setHttpRequest(req) {
    this._httpRequest = req;
  }
}
