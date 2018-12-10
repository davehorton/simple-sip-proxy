const nullLogger = require('../utils/null-logger');
const Route = require('./route');
const assert = require('assert');

class RouteSet {
  constructor(type, config, logger) {
    this.type = type;
    this.config = config;

    const opts = config.has(`routes.${type}`) ? config.get(`routes.${type}`) : {};

    const conditionalRoutes = Object.keys(opts).filter((k) => k !== 'default');
    this.routes = conditionalRoutes.map((key) => new Route(key, opts[key], config, logger));
    if (opts.default) this.default = new Route('default', opts.default, config, logger);
    this.logger = logger || nullLogger;
  }

  get hasDefaultRoute() {
    return typeof this.default !== 'undefined';
  }

  setDefaultRoute(def) {
    assert(!this.hasDefault);
    this.default = new Route('default', def, this.config, this.logger);
  }

  toJSON() {
    return {routes: this.routes, default: this.default};
  }

  evaluate(req) {
    const logger = this.logger.child({'Call-ID': req.get('Call-ID')});
    logger.debug(`RouteSet ${this.type}: evaluating..`);

    // try conditional routes first
    for (const route of this.routes) {
      const target = route.evaluate(req);
      if (target) {
        logger.debug(`RouteSet ${this.type}: matched ${route.type}`);
        return target;
      }
    }

    if (this.default) {
      logger.debug(`RouteSet ${this.type}: no matches, returning default route`);
      return this.default.evaluate(req);
    }

    logger.info(`RouteSet ${this.type}: no matches and no default`);
  }
}

module.exports = RouteSet;
