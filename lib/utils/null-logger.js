const noLogger = {};
['error', 'info', 'debug'].forEach((m) => noLogger[m] = () => {});
noLogger.child = function() { return noLogger; };

module.exports = noLogger;
