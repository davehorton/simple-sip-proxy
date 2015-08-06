'use strict';

var fs = require('fs') ;
var path = require('path') ;
var _ = require('lodash') ;
var allPossibleTargets = [] ;
var dest = [] ;
var debug ;
var config ;

//watch config file for changes - we allow the user to dynamically add or remove targets
var configPath = path.resolve(__dirname) + '/../config.js' ;
fs.watchFile(configPath, function () {
  try {
    delete require.cache[require.resolve(configPath)] ;
    config = require(configPath) ;
    createTargets( config ) ;
    console.log('config.js was modified, proxy targets are now: ', allPossibleTargets) ;
  } catch( err ) {
    console.error('Error re-reading config.js after modification; check to ensure there are no syntax errors: ', err) ;
  }
}) ;

function createTargets( config ) {
  allPossibleTargets = _.filter( config.targets, function(t) { return t.enabled !== false; }) ;
}

function pingTarget( app, target ) {
  //start a timer
  target.to = setTimeout( function() {
    //if we get here we timed out
    if( !target.offline ) {
        target.offline = true ;
        target.to = null ;
        debug('taking target offline: ', JSON.stringify(target)) ;
    }
  }, 2000 ) ;

  //send the OPTIONS ping
  var dest =  'sip:' + target.address + ':' + (target.port || 5060) ;
  app.request({
      uri: dest,
      method: 'OPTIONS',
      headers: {
        'User-Agent': 'drachtio simple proxy'
      }
  }, function( err, req ) {
    if( err ) { return console.error('Error pinging %s', target) ;}
    debug('sent PING to %s', dest) ;
    req.on('response', function(res){
      debug('PING response from %s was %s', dest, res.status) ;

      if( target.to ) {
        debug('clearing timeout for: ', dest) ;
        clearTimeout( target.to ) ;
      }
      if( 200 === res.status ) {
        if( target.offline ) {
           target.offline = false ;
           debug('bringing target back online: ', JSON.stringify(target)) ;
        }
      }
    }) ;
  }) ;
}

function startPinging( app ) {
  for( var i = 0; i < allPossibleTargets.length; i++ ) {
    var t = allPossibleTargets[i] ;
    (function(target) {
      setInterval( function() { pingTarget(app,target); }, 5000) ;
    })(t) ;
  }
}

module.exports = function(app) {
  debug = app.debug ;
  config = app.config ;

  createTargets(config) ;
  startPinging(app) ;

  app.invite( function(req,res) {

    //filter out offline servers
    var onlineServers = _.filter( allPossibleTargets, function(t) { return !t.offline; }) ;
    var dest = _.map(  onlineServers, function(t) { return t.address + ':' + (t.port || 5060); }) ;

    debug('proxy destinations are: ', dest) ;
    req.proxy({
      remainInDialog: false,
      destination: dest
    }, function(err, results) {
      if( err ) console.error('Error proxying: ', err) ;
      debug('proxy result: ', JSON.stringify(results)) ;
    }) ;

    //round-robin the next starting server in the list
    var item = allPossibleTargets.shift() ;
    allPossibleTargets.push( item ) ;
  }) ;
} ;


