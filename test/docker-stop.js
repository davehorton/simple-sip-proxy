const test = require('blue-tape');
const exec = require('child_process').exec ;

test('stopping docker network..', (t) => {
  t.timeoutAfter(20000);
  exec(`docker-compose -f ${__dirname}/docker-compose-testbed.yaml down`, (err, stdout, stderr) => {
    //console.log(`stdout: ${stdout}`);
    //if (stderr.length) console.log(`stderr: ${stderr}`);
    t.pass('docker network stopped');
    t.end() ;
    process.exit(0);
  });
});

