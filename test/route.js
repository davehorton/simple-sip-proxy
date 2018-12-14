const test = require('blue-tape');
const makeInviteRequest = require('./data/invite');
const Route = require('../lib/routing/route');

test('Route', (t) => {
  process.env.NODE_APP_INSTANCE = 1;
  const config = require('config');

  let route = new Route('default', '10.10.100.1', config);
  const req = makeInviteRequest({
    from: '+16173333456',
    to: '+16173333456',
    source_address: '10.10.100.3',
    source_port: 5060
  });

  t.equal(route.evaluate(req), '10.10.100.1', 'default route with single entry works');

  route = new Route('default', ['10.10.100.1'], config);
  t.equal(route.evaluate(req), '10.10.100.1', 'default route with single element array works');

  route = new Route('work', {
    regex: '^5753606$',
    match: '10.10.100.2'
  }, config);
  t.equal(route.evaluate(req), '10.10.100.2', 'regex exact match on calling number works');

  route = new Route('work', {
    regex: '^4083084809$',
    match: '10.10.100.2',
    against: 'from'
  }, config);
  t.equal(route.evaluate(req), '10.10.100.2', 'regex exact match on calling number works');

  route = new Route('work', {
    regex: '^57566',
    'no-match': '10.10.100.2'
  }, config);
  t.equal(route.evaluate(req), '10.10.100.2', 'regex no-match on calling number works');

  t.end();
});
