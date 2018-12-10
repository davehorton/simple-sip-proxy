const Emitter = require('events');
const nullLogger = require('./null-logger');
const assert = require('assert');

const offlineUris = new Set();

class PingTester extends Emitter {
  constructor(opts) {
    super();

    assert(opts.uri);
    assert(opts.srf);
    this._logger = opts.logger || nullLogger;
    this._timeout = opts.timeout || 2000;
    this._interval = opts.interval || 10000;
    this._srf = opts.srf;
    this.online = true;

    this._interval = setInterval(this._ping.bind(this, `sip:${opts.uri}`), this._interval);

    this
      .on('offline', (uri) => offlineUris.add(uri))
      .on('online', (uri) => offlineUris.delete(uri));

    this._srf.on('disconnect', () => {
      this.stopPinging();
    });
  }

  static isOffline(uri) {
    return offlineUris.has(`sip:${uri}`);
  }

  get logger() {
    return this._logger;
  }

  stopPinging() {
    clearInterval(this._interval);

  }

  _ping(uri) {

    // set a timeout to wait for a response
    const timeout = setTimeout(() => {
      if (this.online) {
        this.online = false;
        this.emit('offline', uri);
      }
    }, this._timeout);

    // send an OPTIONS ping
    this._srf.request({
      uri: uri,
      method: 'OPTIONS'
    })
      .then((req) => {
        return req.on('response', (res) => {
          clearTimeout(timeout);
          const status = res.status;
          if (200 === status && !this.online) {
            this.online = true;
            this.emit('online', uri);
          }
          else if (200 !== status && this.online) {
            this.online = false;
            this.emit('offline', uri);
          }
        });
      })
      .catch((err) => {
        this.logger.error(err, `Error sending OPTIONS ping tp ${uri}`);
      });
  }

}

module.exports = PingTester;
