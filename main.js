var optimist = require('optimist');

/**
 * Creates a jake task to display tests within the project that most frequently fail.
 */
var errorCounterTask = function (jenkinsProject) {
  namespace('spec', function () {
    desc('Display tests that most frequently fail');
    task('errorCounter', function () {
      var args = optimist.parse([].slice.apply(arguments));

      args.jenkinsProject = jenkinsProject;
      console.log({args: args});
      require('./jake-spec-error-counter').startExternally(args, complete);
    }, {async: true});
  });
};

exports.errorCounterTask = errorCounterTask;