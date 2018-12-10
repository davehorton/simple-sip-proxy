const test = require('blue-tape');
const clearModule = require('clear-module');
const PingTester = require('../lib/utils/ping-tester');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

test('end-to-end tests', (t) => {
  t.timeoutAfter(30000);

  clearModule('config');
  clearModule('../lib/routing/route-manager');
  process.env.NODE_APP_INSTANCE = 100;

  let srf, obj;

  Promise.resolve()
    .then(() => {
      srf = require('../app');
      return new Promise((resolve, reject) => {
        srf.on('connect', (err) => {
          if (err) return reject(err);
          resolve();
        });
      })
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          t.ok(!PingTester.isOffline('172.19.0.110'), 'server marked online by responding 200 to OPTIONS');
          t.ok(PingTester.isOffline('172.19.0.111'), 'server marked offline by responding non-200 to OPTIONS');
          t.ok(PingTester.isOffline('172.19.0.121'), 'server marked offline by not responding to OPTIONS');
          resolve();
        }, 4000);
      });
    })
    /*
    .then(() => {
      t.pass('application connected to drachtio server');
      obj = require('./sipp')('test_testbed', '172.19.0.50');
      return obj.sippUac('uac-expect-403.xml');
    })
    .then(() => {
      return t.pass('INVITE from unknown carrier / trunk rejected with 403');
    })
    .then(() => {
      obj = require('./sipp')('test_testbed', '172.19.0.100');
      return obj.sippUac('uac.xml');
    })
    .then(() => {
      return t.pass('INVITE successfully proxied with defaults when no routing specified');
    })
    */
    .then(() => {
      srf.emit('disconnect');
      srf.disconnect();
      t.end();
      return new Promise((resolve) => setTimeout(() => resolve(), 1000));
    })
    .catch((err) => {
      if (srf) srf.disconnect();
      console.log(`error received: ${err}`);
      //console.log(obj.output());
      t.error(err);
    });
});
