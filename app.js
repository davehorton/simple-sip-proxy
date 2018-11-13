const Srf = require('drachtio-srf') ;
const srf = new Srf();
const config = require('config');
const pino = require('pino');
const level = config.has('log.level') ? config.get('log.level') : 'info';
const logger = srf.locals.logger = pino({level});
const inviteHandler = require('./lib/invite')({logger, srf});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

srf.connect(config.get('drachtio'))
  .on('connect', (err, hp) => {
    if (err) return logger.error(err, 'error connecting');
    logger.info(`connected to drachtio server at ${hp}`);
  })
  .on('error', (err) => {
    logger.error(err, 'Error connecting to drachtio server');
  });

srf.invite(inviteHandler);
