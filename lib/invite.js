const RouteManager = require('./routing/route-manager');

module.exports = function({logger, srf, routeMgr}) {
  const parentLogger = logger;

  return function(req, res) {
    const logger = parentLogger.child({'callId': req.get('Call-Id')});

    const uri = routeMgr.chooseRoute(req.locals.source.trunkType, req);

    logger.info(`received inbound call from carrier ${JSON.stringify(req.locals.source)}, uri: ${uri}`);

    if (req.locals.source.trunkType === RouteManager.INBOUND_TRUNK) {
      return res.send(480);
    }
    res.send(503);
  };
};
