'use strict';

var fs = require('fs') ;
var path = require('path') ;
var _ = require('lodash') ;
var allPossibleTargets = [] ;
var dest = [] ;
var debug ;
var config ;

//watch config file for changes - we allow the user to dynamically add or remove targets
fs.watchFile(path.resolve(__dirname) + '/../config.js', function (event, filename) {
    if ('change' === event ) {
      createTargets( config ) ;
      console.log('config.js was modified, target list is now: ', allPossibleTargets) ;
    }
});

function createTargets( config ) {
  allPossibleTargets = _.filter( config.targets, function(t) { return t.enabled !== false; }) ;
}

module.exports = function(app) {
  debug = app.debug ;
  config = app.config ;

  createTargets(config) ;

  app.invite( function(req,res) {
    var dest = _.map( allPossibleTargets, function(t) { return t.address + ':' + (t.port || 5060); }) ;
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


