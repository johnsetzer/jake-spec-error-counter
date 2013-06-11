var argv = require('optimist')
  .usage('Usage: $0 --host [example.com] --project [projectname] (--latest ' +
    '[num] OR --from [num] --to [num])')
  .demand('project')
  .alias('h', 'host')
  .describe('host', 'The jenkin server\'s host ex: jenkins.domain.com')
  .alias('p', 'project')
  .describe('project', 'The jenkins project to scan ex: workfeed-js')
  .alias('l', 'latest')
  .describe('latest', 'The number of most recent builds to parse')
  .alias('f', 'from')
  .describe('from', 'The build number of the first build to scan')
  .alias('t', 'to')
  .describe('to', 'The build number of the last build to scan')
  .check(function (args) {
    if (args.latest === undefined) {
      if (typeof args.from !== 'number' || typeof args.to !== 'number') {
        throw new Error('"--num" or "--from" and "--to" must be provided');
      }
    }
    if (args.from < 1) {
      throw new Error('"from" must be greater than one');
    }
    if (args.to < args.from) {
      throw new Error('"from" must be less than "to"');
    }
  })
  .argv,
  _ = require('underscore'),
  async = require('async'),
  http = require('http'),
  DEFAULTS = {
    HOST: 'jenkins.int.yammer.com'
  },
  host = argv.host || DEFAULTS.HOST,
  project = argv.project || DEFAULTS.PROJECT,
  browserFails = {},
  specFails = {},
  numBuilds = 0,
  numFailedBuilds = 0;

if(argv.latest) {
  getLatestBuild(host, project, init);
} else {
  // Init validates --from and --to args
  init();
}

function incrementKey (obj, key) {
  obj[key] = obj[key] ? obj[key] + 1 : 1;
}

function tallyLog (rawLog, cb) {

  var matches = rawLog.match(/.*\[(\w+)\-.*FAILED Spec\[(.*)\].*/ig);

  if(matches) {
    matches.forEach(function (m) {
      // Same as meatches but with no g flag
      var rematch = m.match(/.*\[(\w+)\-.*FAILED Spec\[(.*)\].*/i),
        browser = rematch[1],
        spec = rematch[2];

      incrementKey(browserFails, browser);
      incrementKey(specFails, spec);
    });

    numFailedBuilds++;
  }

  numBuilds++;

  cb();
}

function getLatestBuild (host, project, next) {
  var options = {
    host: host,
    port: 80,
    path: '/job/' + project + '/api/json'
  },
  file = '';

  http.get(options, function (res) {
    res.on('data', function (chunk) {
      file += chunk.toString();
    }).on('end', function () {
      file = JSON.parse(file);
      next(null, file.builds[0].number);
    });
  }).on('error', function (e) {
    next(e);
  });
}

function getLog (buildNumber, cb) {
  var options = {
    host: host,
    port: 80,
    path: '/job/' + project + '/' + buildNumber + '/consoleText' // Good test build 6277
  },
  file = '';

  http.get(options, function (resp) {
    resp.on('data', function (chunk) {
      var str = chunk.toString();
      file += str;
    }).on('end', function () {
      tallyLog(file, cb);
    });
  }).on('error', function (e) {
    cb(e);
  });
}

function sortAndPrint (fails) {
  _.chain(fails)
    .pairs().sortBy(function (pair){
      return pair[1] * -1;
    }).each(function (pair){
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

function init (err, latestBuild) {
  if(err) {
    throw new Error('Error: Could not get latest build number', e);
  }
  var gets = [],
    latest = argv.latest,
    from = argv.from || latestBuild - latest + 1,
    to = argv.to || latestBuild;

  console.log('Fetching "' + project + '" from: ' + host);
  console.log('Builds:', {from: from, to: to, latest: latest});

  for (var i = from; i <= to; i++) {

    // Create a scope to close build number around
    (function () {
      var build = i;
      gets.push(function (cb) {
        getLog(build, cb);
      });
    }());
  }

  async.parallel(gets, function (err, results) {

    if (err) {
      console.log(err);
      process.exit();
    }

    printResults();
    console.log('\nDone.');
  });
}