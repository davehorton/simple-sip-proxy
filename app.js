'use strict';

var drachtio = require('drachtio') ;
var app = drachtio() ;
var config = app.config = require('./config');
var fs = require('fs') ;
var rangeCheck = require('range_check');
var debug = app.debug = require('debug')('simple-sip-proxy') ;

// Expose app
exports = module.exports = app;

//connect to drachtio server
app.connect({
  host: config.drachtioServer.address,
  port: config.drachtioServer.port,
  secret: config.drachtioServer.secret,
}) ;

app.on('connect', function(err, hostport) {
  if( err ) throw err ;
  console.log('connected to drachtio server at %s', hostport) ;
})
.on('error', function(err){
  console.warn(err.message ) ;
}) ;

app.use(function checkSender(req, res, next) {
  if( !rangeCheck.inRange( req.source_address, app.config.authorizedSources) ) { return res.send(403) ; }
  next() ;
}) ;
app.use(function onlyInvites( req, res, next ) { 
  if( -1 === ['invite','cancel','prack','ack'].indexOf( req.method.toLowerCase() ) ) { return res.send(405); }
  next() ;
}); 

require('./lib/proxy.js')(app); 

//handle any errors thrown while executing middleware stack
app.use(function myErrorHandler(err, req, res, next) {
  debug('caught error generated from middleware: ', err); 
  res.send(500, {
    headers: {
      'X-Error-Info': err.message || 'unknown application error'
    }
  }) ;
}) ;


