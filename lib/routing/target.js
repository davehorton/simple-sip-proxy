const assert = require('assert');
const nullLogger = require('../utils/null-logger');
const PingTester = require('../utils/ping-tester');

/**
 * A Target may be any of the following:
 *
 * a single sip address[:port]
 *    '10.10.100.1' or '10.10.100.2:5061'
 *
 * an array of sip addresses
 *    ['10.10.100.1', '10.10.100.2:5061']
 *
 * a single group name, or array of group names
 *    'international', or ['cheapest', 'moderate']
 *
 * an array of weighted entries (sip addresses or groups)
 *    [{dest: '10.10.100.1', weight: 1}, {dest: '10.10.100.2:5061', weight: 2}]
 *
 *    or
 *
 *    [{dest: 'cheapest', weight: 5}, {dest: 'moderate', weight: 1}]
 */
class Target {
  constructor(opts, config, logger) {

    this.entries = (Array.isArray(opts) ? opts : [opts]).map((t) => {
      assert.ok(typeof t === 'string' || (t.dest && t.weight),
        `invalid target configuration ${JSON.stringify(t)}: must have dest and weight properties`);
      return typeof t === 'string' ? {dest: t, weight: 1} : t;
    });

    // map trunk and group names to ip addresses
    const disabledTrunks = new Set();
    const outside = new Map();
    if (config.get('trunks.outside')) {
      const obj = config.get('trunks.outside');
      Object.keys(obj).forEach((k) => {
        const trunk = obj[k];
        if (['out', 'both'].includes(trunk.direction)) {
          const address = Array.isArray(trunk.address) ? trunk.address : [trunk.address];
          if (trunk.enabled === false) disabledTrunks.add(k);
          const groups = Array.isArray(trunk.groups) ? trunk.groups :
            (typeof trunk.groups === 'string' ? [trunk.groups] : []);
          outside.set(k, (outside.get(k) || []).concat(address));

          if (trunk.enabled !== false) {
            groups.forEach((g) => {
              outside.set(g, (outside.get(g) || []).concat(address));
            });
          }
        }
      });
    }

    const inside = new Map();
    if (config.get('trunks.inside')) {
      const obj = config.get('trunks.inside');
      Object.keys(obj).forEach((k) => {
        const trunk = obj[k];
        if (trunk.enabled === false) disabledTrunks.add(k);
        const address = Array.isArray(trunk.address) ? trunk.address : [trunk.address];
        const groups = Array.isArray(trunk.groups) ? trunk.groups :
          (typeof trunk.groups === 'string' ? [trunk.groups] : []);
        inside.set(k, (inside.get(k) || []).concat(address));

        if (trunk.enabled !== false) {
          groups.forEach((g) => {
            inside.set(g, (inside.get(g) || []).concat(address));
          });
        }
      });
    }

    // expand entries that reference group or trunk names
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (outside.has(e.dest) || inside.has(e.dest)) {
        const addresses = outside.get(e.dest) || inside.get(e.dest);
        const replacement = disabledTrunks.has(e.dest) ?
          [] :
          addresses.map((a) => Object.assign({}, {dest: a, weight: e.weight}));
        this.entries[i] = replacement;
        for (let j = 0; j < this.entries.length; j++) {
          if (j !== i) this.entries[j].weight *= replacement.length;
        }
      }
    }
    this.entries = [].concat(...this.entries); //flatten

    /**
     * if only 1 target: just select it
     * if N equally-weighted entries: round robin
     * otherwise, percentage-based using random number generation
     */
    if (this.entries.length > 1) {
      const total = this.entries.reduce((accumulator, currentValue) => accumulator + currentValue.weight, 0);
      if (total === this.entries.length) {
        this.rrSelected = 0;
      }
      else {
        let floor = 0;
        this.entries.forEach((t) => {
          const delta = Math.floor(t.weight / total * 100.0);
          t.floor = floor;
          t.ceiling = floor + delta;
          floor = t.ceiling;
        });
        this.entries[this.entries.length - 1].ceiling = 100;
      }
    }
    this.logger = logger || nullLogger;
  }

  toJSON() {
    return {
      entries: this.entries,
      rrSelected: this.rrSelected
    };
  }

  evaluate() {
    /* remove offline servers */
    const entries = this.entries.filter((e) => !PingTester.isOffline(e.dest));

    if (entries.length === 1) return entries[0].dest;

    if (this.rrSelected >= 0) {
      const sel = this.rrSelected++;
      if (this.rrSelected > entries.length - 1) this.rrSelected = 0;
      return entries[sel].dest;
    }

    const rand = Math.floor(Math.random() * 100);
    for (const t of entries) {
      if (rand >= t.floor && rand < t.ceiling) return t.dest;
    }

    this.logger.error(`Target#evaluate all targets offline or not responding: ${JSON.stringify(this.entries)}`);
  }

}

module.exports = Target;
