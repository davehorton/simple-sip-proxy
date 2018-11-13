const config = require('config');
let pinging = false;
const pingInterval = Math.max(config.optionsPingInterval || 5000, 2000);
let allPossibleTargets = [];

function startPinging(srf) {
  pinging = true;
  allPossibleTargets = config.get('targets').filter((t) => t.enabled);
  allPossibleTargets.forEach((t) => pingTarget(srf, t));
}

function stopPinging() {
  pinging = false;
  allPossibleTargets = [];
}

function pingTarget(srf, target) {
  if (!pinging) return;

  const dest =  `sip:${target.address}:${target.port || 5060}` ;
  const timer = setTimeout(() => target.offline = true, 1500) ;

  srf.request(dest, {method: 'OPTIONS'})
    .then((req) => {
      return req.on('response', (res) => {
        clearTimeout(timer);
        if (res.status === 200) target.online = true;
        else target.offline = true;
        setTimeout(() => {
          if (pinging) pingTarget(srf, target); 
        }, pingInterval);
      });
    })
    .catch((err) => {
      setTimeout(() => {
        if (pinging) pingTarget(srf, target); 
      }, pingInterval);
    });
}

module.exports = function(opts) {
  const parent = opts.logger;
  const srf = opts.srf;

  srf
    .on('connect', () => startPinging(srf))
    .on('error', () => stopPinging(srf));

  return function(req, res) {
    const logger = parent.child({'callId': req.get('Call-Id')});

    //prepare the ordered list of servers to attempt
    const onlineServers = allPossibleTargets.filter((t) => t.online);
    if (0 === onlineServers.length) {
      logger.info('no available servers, rejecting with 480');
      return res.send(480);
    }

    const dest = onlineServers.map((t) => `${t.address}:${t.port || 5060}`);
    logger.info(`destinations are ${dest}`);
    srf.proxyRequest(req, res, dest)
      .then((results) => {
        return logger.debug(results, 'results from proxy');
      })
      .catch((err) => {
        logger.error(err, 'error proxying invite');
      });

    //round-robin..
    allPossibleTargets.push(allPossibleTargets.shift()) ;
  };
};
