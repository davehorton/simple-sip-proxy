module.exports = function({logger, srf, routeMgr}) {
  const parentLogger = logger;

  return function(req, res) {
    const logger = parentLogger.child({'callId': req.get('Call-Id')});
    const sourceSide = req.locals.source.side;
    const destSide = sourceSide === 'inside' ? 'outside' : 'inside';
    const uri = routeMgr.chooseRoute(destSide, req);

    if (!uri) {
      logger.error(req.locals.source, 'No available routes for this call, returning 480');
      return res.send(480);
    }
    logger.info(req.locals.source, `received call from ${sourceSide}, proxying to uri: ${uri}`);

    srf.proxyRequest(req, uri, {
      recordRoute: true
    });
  };
};
