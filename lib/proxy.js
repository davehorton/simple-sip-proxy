'use strict';

var fs = require('fs') ;
var path = require('path') ;
var _ = require('lodash') ;
var allPossibleTargets = [] ;
var dest = [] ;
var debug ;
var config ;

function createTargets( config ) {
  allPossibleTargets = _.filter( config.targets, function(t) { return t.enabled !== false; }) ;
}

function pingTarget( app, target ) {
  //start a timer - if we don't get a response within a second we'll mark it down
  target.to = setTimeout( function() {
    //if we get here we timed out
    if( !target.offline ) {
        target.offline = true ;
        target.to = null ;
        console.log('taking target offline: ', JSON.stringify(target)) ;
    }
  }, 1000 ) ;

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
    req.on('response', function(res){

      if( target.to ) {
        clearTimeout( target.to ) ;
      }
      if( 200 === res.status ) {
        if( target.offline ) {
           target.offline = false ;
           console.log('bringing target back online: ', JSON.stringify(target)) ;
        }
      }
    }) ;
  }) ;
}

function stopPinging() {
  console.log('stop pinging') ;
  allPossibleTargets.forEach( function(target) { 
    if( target.interval ) {
      clearInterval( target.interval ) ;
      target.interval = null ;
    }
  }) ;
}

function startPinging( app, config ) {
  var milliseconds = (config.optionsPingInterval || 5) * 1000 ;
  console.log('start pinging at %d ms interval', milliseconds) ;
  for( var i = 0; i < allPossibleTargets.length; i++ ) {
    var t = allPossibleTargets[i] ;
    if( !!t.optionsPing ) {
      (function(target) {target.interval = setInterval( function() { pingTarget(app,target); }, milliseconds) ;})(t) ;
    }   
  }
}

module.exports = function(app) {
  debug = app.debug ;
  config = app.config ;

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


