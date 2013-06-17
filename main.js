var optimist = require('optimist');

/**
 * Creates a jake task to display tests within the project that most frequently fail.
 */
var errorCounterTask = function (jenkinsProject) {
  namespace('spec', function () {
    desc('Display tests that most frequently fail');
    task('errorCounter', function () {
console.log('initially passed args:', arguments);
      var args = arguments[0].split(' ');

      args.push('--project', jenkinsProject);
console.log({'task args': args});
      require('./jake-spec-error-counter').startExternally(args, complete);
    }, {async: true});
  });
};

exports.errorCounterTask = errorCounterTask;