const nullLogger = require('../utils/null-logger');
const Target = require('./target');

class Route {
  constructor(name, opts, config, logger) {
    this.name = name;

    if (Array.isArray(opts)) {
      this.alwaysTargets = new Target(opts, config, logger);
    }
    else if (typeof opts === 'string') {
      this.alwaysTargets = new Target([opts], config, logger);
    }
    else {
      this.regex = opts.regex;
      if (opts.match) this.match = new Target(opts.match, config, logger);
      if (opts['no-match']) this.noMatch = new Target(opts['no-match'], config, logger);
      this.against = (opts.against || 'to').toLowerCase();
    }
    this.logger = logger || nullLogger;
  }

  toJSON() {
    return {
      name: this.name,
      alwaysTargets: this.alwaysTargets,
      regex: this.regex,
      against: this.against,
      match: this.match,
      noMatch: this.noMatch
    };
  }

  evaluate(req) {
    const logger = this.logger.child({'Call-ID': req.get('Call-ID')});
    let inspected;

    if (this.alwaysTargets) {
      return this.alwaysTargets.evaluate();
    }

    if (this.against === 'from') {
      inspected = req.callingNumber;
    }
    else {
      inspected = req.calledNumber;
    }

    let matched = false;
    try {
      matched = inspected && inspected.match(new RegExp(this.regex));
    } catch (err) {
      logger.error(`error evaluating regex: ${err}`);
      return;
    }

    if (this.match && matched) {
      logger.debug(`Route ${this.name}: routing based on ${this.against} match ${inspected}: ${this.match}`);
      return this.match.evaluate();
    }

    if (this.noMatch && !matched) {
      logger.debug(`Route: ${this.name} routing based on ${this.against} no-match ${inspected}: ${this.noMatch}`);
      return this.noMatch.evaluate();
    }
  }
}

module.exports = Route;
