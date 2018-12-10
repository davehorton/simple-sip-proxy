module.exports = ({logger, routeMgr}) => {
  return (req, res, next) => {
    req.locals = {};
    req.locals.source = routeMgr.isValidSendingAddress(`${req.source_address}:${req.source_port}`);
    if (!req.locals.source) {
      logger.info(`rejecting INVITE from invalid source address ${req.source_address}`);
      return res.send(403);
    }

    next();
  };
};
