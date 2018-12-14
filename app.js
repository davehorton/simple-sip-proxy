const Srf = require('drachtio-srf') ;
const srf = new Srf();
const config = require('config');
const pino = require('pino');
const level = config.has('log.level') ? config.get('log.level') : 'info';
const logger = srf.locals.logger = pino({level});
const RouteMgr = require('./lib/routing/route-manager');
const routeMgr = new RouteMgr({logger, srf});
const validate = require('./lib/validation-middleware')({logger, routeMgr});
const inviteHandler = require('./lib/invite')({logger, srf, routeMgr});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

srf.connect(config.get('drachtio'))
  .on('connect', (err, hp) => {
    if (err) return logger.error(err, 'error connecting');
    logger.info(`connected to drachtio server at ${hp}`);
  });

if (process.env.NODE_ENV !== 'test') {
  srf.on('error', (err) => {
    logger.error(err, 'Error connecting to drachtio server');
  });
}

srf.use(validate);
srf.invite(inviteHandler);
srf.info((req, res) => res.send(200));


// for test purposes only
if (process.env.NODE_ENV === 'test') {
  srf.routeMgr = () => routeMgr;

  module.exports = srf;
}
