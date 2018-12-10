const test = require('blue-tape');
const makeInviteRequest = require('./data/invite');
const clearModule = require('clear-module');

test('RouteSet', (t) => {
  process.env.NODE_APP_INSTANCE = 1;
  let config = require('config');

  let RouteSet = require('../lib/routing/route-set');
  let rsInside = new RouteSet('inside', config);
  t.ok(rsInside.hasDefaultRoute, 'default route is loaded from config');

  const req = makeInviteRequest({
    from: '+16173333456',
    to: '+16173333456',
    source_address: '10.10.100.3',
    source_port: 5060
  });

  let uri = rsInside.evaluate(req);
  t.equal(uri, '10.10.200.1', 'default route selected');

  let rsOutside = new RouteSet('outside', config);
  uri = rsOutside.evaluate(req);
  t.equal(uri, '10.10.100.6', 'selected conditional route');

  clearModule('config');
  clearModule('../lib/routing/route-set');
  process.env.NODE_APP_INSTANCE = 2;
  
  config = require('config');
  RouteSet = require('../lib/routing/route-set');

  rsInside = new RouteSet('inside', config);
  t.ok(!rsInside.hasDefaultRoute, 'route.inside is optional');
  uri = rsInside.evaluate(req);
  t.notOk(uri, 'empty route set can not return a route');

  rsInside.setDefaultRoute('10.10.200.1');
  uri = rsInside.evaluate(req);
  t.equal(uri, '10.10.200.1', 'default route can be set');

  t.end();
});
