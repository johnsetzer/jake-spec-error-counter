var argv = require('optimist')
    .usage('Usage: $0 --host [example.com] --from [num] --to [num]')
    .demand(['host', 'from', 'to'])
    .describe('host', 'The jenkin server\'s host ex: jenkins.domain.com')
    .describe('from', 'The build number of the first build to scan')
    .describe('to', 'The build number of the last build to scan')
    .check(function (args) {
      if (args.from < 1) {
        throw new Error('"from" must be greater than one');
      }
      if (args.to < args.from) {
        throw new Error('"from" must be less than "to"');
      }
    })
    .argv;

var _ = require('underscore');
var async = require('async');
var http = require('http');

console.log('Running with:', argv.host, argv.from, argv.to);

var browserFails = {};
var specFails = {};
var numBuilds = 0;
var numFailedBuilds = 0;

function incrementKey (obj, key) {
  obj[key] = obj[key] ? obj[key] + 1 : 1;
}

function tallyLog (rawLog, cb) {

  var matches = rawLog.match(/.*\[(\w+)\-.*FAILED Spec\[(.*)\].*/ig);

  if(matches) {
    matches.forEach(function (m) {
      // Same as meatches but with no g flag
      var rematch = m.match(/.*\[(\w+)\-.*FAILED Spec\[(.*)\].*/i);
      var browser = rematch[1];
      var spec = rematch[2];
      incrementKey(browserFails, browser);
      incrementKey(specFails, spec);
    });

    numFailedBuilds++;
  }

  cb();
}

function getLog (buildNumber, cb) {
  var options = {
    host: argv.host,
    port: 80,
    path: '/job/yamjs/' + buildNumber + '/consoleText' // Good test build 6277
  };

  var file = '';

  http.get(options, function(resp) {
    resp.on('data', function(chunk) {
      var str = chunk.toString();
      file += str;    
    }).on('end', function() {
      tallyLog(file, cb);
    });
  }).on('error', function(e) {
    cb(e);
  });
}

function sortAndPrint (fails) {
  _.chain(fails)
    .pairs().sortBy(function(pair){ 
      return pair[1] * -1; 
    }).each(function(pair){
      console.log(pair[0] + ': ' +  pair[1]);
    }); 
}

function printResults () {
  console.log('Number of Builds:        ' + numBuilds);
  console.log('Number of Failed Builds: ' + numFailedBuilds);
  console.log('Fail Ratio:              ' + numFailedBuilds / numBuilds);
  console.log('\nBrowser Fails:');
  sortAndPrint(browserFails);
  console.log('\nSpec Fails:');
  sortAndPrint(specFails);
}

var gets = [];
for (var i = argv.from; i <= argv.to; i++) {
  
  // Create a scope to close build number around
  (function() {
    var build = i;
    gets.push(function (cb) {
      getLog(build, cb);
    });
  })();
  
  numBuilds++;
}

async.parallel(gets, function(err, results) {
  if (err) {
    console.log(err);
    process.exit();
  } 
  
  printResults();  
  console.log('\nDone.');
});
