var optimist = require('optimist');

/**
 * Creates a jake task to display tests within the project that most frequently fail.
 */
var sauceErrorCounterTask = function (jenkinsProject) {
  namespace('spec', function () {
    desc('Display tests that most frequently fail');
    task('sauceErrorCounter', function () {
      var args = arguments[0].split(' ');

      args.push('--project', jenkinsProject);
      require('./jake-spec-error-counter').startExternally(args, complete);
    }, {async: true});
  });
};

exports.sauceErrorCounterTask = sauceErrorCounterTask;