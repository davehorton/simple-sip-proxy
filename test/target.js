const test = require('blue-tape');
const Target = require('../lib/routing/target');

test('Target', (t) => {
  process.env.NODE_APP_INSTANCE = 1;
  const config = require('config');

  let target = new Target('10.10.100.1', config);
  t.deepEqual(target.entries, [{dest: '10.10.100.1', weight: 1}], 'supplying single IP works');
  t.equal(target.evaluate(), '10.10.100.1', 'single IP evaluates to itself')

  target = new Target(['10.10.100.1', '10.10.100.2'], config);
  t.deepEqual(target.entries, [{dest: '10.10.100.1', weight: 1}, {dest: '10.10.100.2', weight: 1}], 
    'supplying array of ips work');
  const mySet = new Set();
  mySet.add(target.evaluate());
  mySet.add(target.evaluate());
  t.equal(mySet.size, 2, 'round robin choices when equally-weighted trunks provided');

  target = new Target(['10.10.100.1', {dest: '10.10.100.2', weight: 2}], config);
  t.deepEqual(target.entries, [
    {dest: '10.10.100.1', weight: 1, floor: 0, ceiling: 33},
    {dest: '10.10.100.2', weight: 2, floor: 33, ceiling: 100}],
  'supplying explicit weights works');

  // to test weighted average we need to generate lots of "calls" and check the resulting ratios
  const results = {};
  for (let i = 0; i < 1000; i++) {
    const uri = target.evaluate();
    if (!results[uri]) results[uri] = 1;
    else results[uri]++;
  }
  const score1 = Math.floor(results['10.10.100.1'] / 1000 * 100);
  const score2 = Math.floor(results['10.10.100.2'] / 1000 * 100);
  t.ok(score1 > 28 && score1 < 37, 'using weighted averages, appserver1 gets ~33%');
  t.ok(score2 > 63 && score2 < 72, 'using weighted averages, appserver2 gets ~66%');

  target = new Target('appserver1', config);
  t.deepEqual(target.entries, [{dest: '10.10.200.1', weight: 1}], 'supplying inside trunk name works');

  target = new Target('carrier-2', config);
  t.deepEqual(target.entries, [{dest: '10.10.100.5', weight: 1}], 'supplying outside trunk name works');

  target = new Target('carrier-4', config);
  t.deepEqual(target.entries, [], 'supplying disabled outside trunk name results in empty set');

  target = new Target('cheap', config);
  t.deepEqual(target.entries,  [
    { dest: '10.10.100.5', weight: 1 },
    { dest: '10.10.100.6', weight: 1 },
    { dest: '10.10.100.7', weight: 1 }],
  'supplying group name works');

  target = new Target([{dest: 'carrier-3', weight: 1}, {dest:'carrier-2', weight: 2}], config);
  t.deepEqual(target.entries, [
    {dest: '10.10.100.6', weight: 1, floor: 0, ceiling: 16},
    {dest: '10.10.100.7', weight: 1, floor: 16, ceiling: 32},
    {dest: '10.10.100.5', weight: 4, floor: 32, ceiling: 100}],
  'weights are properly recalculated when expanding trunk name destinations');

  t.end();
});
