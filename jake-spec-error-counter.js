var _ = require('underscore')
  , async = require('async')
  , http = require('http')
  , DEFAULTS = {
    HOST: 'jenkins.int.yammer.com'
  }
  , browserFails = {}
  , specFails = {}
  , numBuilds = 0
  , numFailedBuilds = 0;

function parseArguments (args) {
console.log('incoming args:', args);
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
    .parse(args)
    , sanitizedArgs = {
      host: argv.h || argv.host || DEFAULTS.HOST
      , project: argv.p || argv.project
      , latest: argv.l || argv.latest
      , from: argv.f || argv.from
      , to: argv.t || argv.to
    };

console.log('argv:', argv);
console.log('sanitizedArgs:', sanitizedArgs);

  return sanitizedArgs;
}

function startExternally (args) {
  init(parseArguments(args));
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
      next(file.builds[0].number);
    });
  }).on('error', function (e) {
    next(e);
  });
}

function getLog (buildNumber, host, project, cb) {
  var options = {
    host: host
    , port: 80
    , path: '/job/' + project + '/' + buildNumber + '/consoleText'
  }
  , file = '';

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
    .pairs().sortBy(function (pair) {
      return pair[1] * -1;
    }).each(function (pair) {
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

function init (sanitizedArgs) {
console.log('init\'s sanitizedArgs:', sanitizedArgs);
  var from
    , to
    , latest;

  if(sanitizedArgs.to && sanitizedArgs.from) {
    fetchProjectLogs(sanitizedArgs);
  } else if (sanitizedArgs.latest) {
    getLatestBuild(sanitizedArgs.host, sanitizedArgs.project, function (latestBuild) {
      // Pass latest build to fetchProjectLogs
      fetchProjectLogs(sanitizedArgs, latestBuild);
    });
  } else {
    throw new Error('Provide (from and to) or latest');
  }

  function fetchProjectLogs (sanitizedArgs, latestBuild) {
console.log('fetchProjectLogs\'s sanitizedArgs:', sanitizedArgs);
    var gets = []
      , from = latestBuild - sanitizedArgs.latest + 1
      , to = latestBuild
      , host = sanitizedArgs.host
      , project = sanitizedArgs.project;

    console.log('Fetching "' + project + '" from: ' + host);
    console.log('Builds:', {from: from, to: to});

    for (var i = from; i <= to; i++) {

      // Create a scope to close build number around
      (function () {
        var build = i;
        gets.push(function (cb) {
          getLog(build, host, project, cb);
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
}

exports.startExternally = startExternally;
