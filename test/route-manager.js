const test = require('blue-tape');
const makeInviteRequest = require('./data/invite');
const clearModule = require('clear-module');

test('RouteManager', (t) => {
  process.env.NODE_APP_INSTANCE = 1;

  clearModule('config');

  const RouteManager = require('../lib/routing/route-manager');
  const mgr = new RouteManager({});
  t.equal(mgr.inboundExternalTrunks.length, 1, '1 enabled inbound outside trunks');
  t.equal(mgr.outboundExternalTrunks.length, 2, '2 enabled outbound outside trunks');
  t.equal(mgr.internalTrunks.length, 2, '2 enabled inside trunks');

  const req = makeInviteRequest({
    from: '+16173333456',
    to: '+16173333456',
    source_address: '10.10.100.3',
    source_port: 5060
  });
  let uri = mgr.chooseRoute('inside', req);
  t.equal(uri, '10.10.200.1', 'selects correct target first time');
  uri = mgr.chooseRoute('inside', req);
  t.equal(uri, '10.10.200.1', 'selects correct target second time');

  t.ok(mgr.isValidSendingAddress('10.10.100.7'), 'allows valid sending source');
  t.notOk(mgr.isValidSendingAddress('10.10.100.3'), 'detects invalid sending source');

  t.end();
});
