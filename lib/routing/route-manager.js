const Emitter = require('events');
const fs = require('fs');
const clearModule = require('clear-module');
const assert = require('assert');
const RouteSet = require('./route-set');
const nullLogger = require('../utils/null-logger');
const PingTester = require('../utils/ping-tester');
const SIDES = ['inside', 'outside'];

class RouteManager extends Emitter {
  constructor({logger, srf}) {
    super();

    this.config = require('config');
    this.logger = logger || nullLogger;
    this.srf = srf;
    this.routeSet = {};
    this.outboundExternalTrunks = [];
    this.inboundExternalTrunks = [];
    this.internalTrunks = [];
    this.pingers = [];
    this._isPinging = false;

    this._init();

    if (process.env.NODE_ENV !== 'test') {
      fs.watch(`${__dirname}/../../config`, (eventType, filename) => {
        if (filename.endsWith('.json')) {
          this.logger.info(`RouteManager: configuration file change ${filename}: ${eventType}`);
          clearModule('config');
          this.config = require('config');
          this._init();
          this.emit('changed');
        }
      });
    }
  }

  get lastTarget() {
    return this._lastTarget;
  }

  get lastUri() {
    return this._lastUri;
  }

  _init() {
    this._initSipTrunks();
    this._initRouteSets();
  }

  _initSipTrunks() {
    assert.ok(this.config.has('trunks.outside'), 'trunks.outside configuration is missing');
    const extTrunks = this.config.get('trunks.outside');

    let arr = Object.keys(extTrunks).filter((k) =>
      ['out', 'both'].includes(extTrunks[k].direction) && extTrunks[k].enabled !== false);
    this.outboundExternalTrunks = arr.map((k) => Object.assign(extTrunks[k], {name: k}));

    arr = Object.keys(extTrunks).filter((k) =>
      ['in', 'both'].includes(extTrunks[k].direction) && extTrunks[k].enabled !== false);
    this.inboundExternalTrunks = arr.map((k) => Object.assign(extTrunks[k], {name: k}));

    assert.ok(this.config.has('trunks.inside'), 'routes.inside configuration is missing');
    const intTrunks = this.config.get('trunks.inside');

    arr = Object.keys(intTrunks).filter((k) => intTrunks[k].enabled !== false);
    this.internalTrunks = arr.map((k) => Object.assign(intTrunks[k], {name: k}));

    assert.ok(this.outboundExternalTrunks.length, 'must have at least one enabled outbound external trunk');
    assert.ok(this.inboundExternalTrunks.length, 'must have at least one enabled inbound external trunk');
    assert.ok(this.internalTrunks.length, 'must have at least one internal trunk');

    /* start OPTIONS ping testing internal trunks */
    this.pingers.forEach((p) => p.stopPinging());
    this.pingers = [];
    if (this.srf) {
      this.internalTrunks.filter((t) => t['options-ping'] === true).forEach((t) => {
        (typeof t.address === 'string' ? [t.address] : t.address).forEach((uri) => {
          this.pingers.push(new PingTester({
            logger: this.logger,
            srf: this.srf,
            uri,
            timeout: t['options-timeout'],
            interval: t['options-interval']
          }));
        });
      });
      this.logger.info(`started pinging ${this.pingers.length} servers ${this.pingers}`);
    }
  }

  _initRouteSets() {
    SIDES.forEach((type) => {
      delete this.routeSet[type];
      this.routeSet[type] = new RouteSet(type, this.config, this.logger);
    });

    if (!this.routeSet.outside.hasDefaultRoute) {
      this.routeSet.outside.setDefaultRoute(
        this.outboundExternalTrunks.map((t) => Object.assign({}, {dest: t['address'], weight: 1}))
      );
    }
    if (!this.routeSet.inside.hasDefaultRoute) {
      this.routeSet.inside.setDefaultRoute(
        Object.keys(this.internalTrunks).map((t) => {
          return {
            dest: this.internalTrunks[t]['address'],
            weight: 1
          };
        })
      );
    }
  }

  chooseRoute(type, req) {
    assert(SIDES.includes(type));
    const uri = this.routeSet[type].evaluate(req);
    if (uri) this.logger.info(`selected uri: ${uri}`);

    return uri;
  }

  isValidSendingAddress(source) {
    let ip = source;
    let trunk;
    const arr = /^(.*):(\d+)$/.exec(source);
    if (arr) ip = arr[1];

    if (trunk = this.inboundExternalTrunks.find((t) =>
      (typeof t.address === 'string' && source === t.address) ||
      (Array.isArray(t.address) && t.address.includes(source)) ||
      (typeof t.address === 'string' && source.endsWith(':5060') && ip === t.address) ||
      (Array.isArray(t.address) && source.endsWith(':5060') && t.address.includes(ip))
    )) {
      return Object.assign(trunk, {side: 'outside'});
    }

    if (trunk = this.internalTrunks.find((t) => ip === t['address'])) {
      return Object.assign(trunk, {side: 'inside'});
    }
  }
}

module.exports = RouteManager;
