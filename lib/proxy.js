'use strict';

var fs = require('fs') ;
var path = require('path') ;
var _ = require('lodash') ;
var allPossibleTargets = [] ;
var dest = [] ;
var debug ;
var config ;
var pingDown = true ;

function createTargets( config ) {
  allPossibleTargets = _.filter( config.targets, function(t) { return t.enabled === true; }) ;
}

function pingTarget( app, target ) {
  var dest =  'sip:' + target.address + ':' + (target.port || 5060) ;
  if( pingDown ) { 
    console.log('not pinging target %s because pinging has been temporarily turned off: ', dest) ;
    return; 
  }

  //start a timer - if we don't get a response within a second we'll mark it down
  var timeoutHandler = setTimeout( function() {
    //if we get here we timed out
    if( !target.offline ) {
        target.offline = true ;
        console.error('taking target %s offline because it did not respond to ping: ', dest) ;
    }
  }, 1500 ) ;

  //send the OPTIONS ping
  console.log('OPTIONS %s', dest) ;
  app.request({
      uri: dest,
      method: 'OPTIONS',
      headers: {
        'User-Agent': 'drachtio simple proxy'
      }
  }, function( err, req ) {
    if( err ) { 
      setTimeout( pingTarget( app, target), 1500) ;
      return console.error('Error pinging %s', target) ;
    }
    
    req.on('response', function(res){

      console.log('%s: %d %s', dest, res.status, res.reason) ;
      clearTimeout( timeoutHandler ) ;
      if( 200 === res.status ) {
        if( target.offline ) {
           target.offline = false ;
           console.log('bringing target back online: %s', dest) ;
        }
      }
      setTimeout( pingTarget( app, target), 1500) ;
    }) ;
  }) ;
}

function stopPinging() {
  console.log('stopping OPTIONS pings..') ;
  pingDown = true ;
}

function startPinging( app, config ) {
  console.log('start OPTIONS pings to targets at %d ms interval: ', config.optionsPingInterval, JSON.stringify(allPossibleTargets)) ;
  pingDown = false ;
  allPossibleTargets.forEach( function(t) {pingTarget(app,t); }) ;
}

module.exports = function(app) {
  debug = app.debug ;
  config = app.config ;

  //min allowed ping interval is 2 seconds
  config.optionsPingInterval = Math.max(config.optionsPingInterval || 5000, 2000) ;
  console.log('options ping interval will be %d milliseconds', config.optionsPingInterval) ;

  createTargets(config) ;
  startPinging(app, config) ;

  //watch config file for changes - we allow the user to dynamically add or remove targets
  var configPath = path.resolve(__dirname) + '/../config.js' ;
  fs.watchFile(configPath, function () {
    try {
      stopPinging() ;

      delete require.cache[require.resolve(configPath)] ;
      config = require(configPath) ;
      createTargets( config ) ;
      
      startPinging(app, config) ;

      console.log('config.js was modified, proxy targets are now: ', 
        _.map( allPossibleTargets, function(t) { return _.pick(t, ['address','port','enabled','optionsPing']);}));
    } catch( err ) {
      console.error('Error re-reading config.js after modification; check to ensure there are no syntax errors: ', err) ;
    }
  }) ;

  app.invite( function(req,res) {

    //filter out offline servers
    var onlineServers = _.filter( allPossibleTargets, function(t) { return !t.offline; }) ;

    if( 0 === onlineServers.length ) {
      console.error('there are no servers online currently') ;
      return res.send(480) ;
    }

    var dest = _.map(  onlineServers, function(t) { return t.address + ':' + (t.port || 5060); }) ;

    debug('proxy destinations are: ', dest) ;

    //finally....here's the magic: proxy the request, attempting destinations in order until we connect or all fail
    req.proxy({
      remainInDialog: false,
      destination: dest
    }, function(err, results) {
      if( err ) console.error('Error proxying: ', err) ;

      //this is voluminous, but if you want to know what happened all the detail is here..
      debug('proxy result: ', JSON.stringify(results)) ;
    }) ;

    //round-robin the next starting server in the list
    var item = allPossibleTargets.shift() ;
    allPossibleTargets.push( item ) ;
  }) ;
} ;


