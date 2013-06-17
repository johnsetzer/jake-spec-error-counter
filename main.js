var optimist = require('optimist');

/**
 * Creates a jake task to display tests within the project that most frequently fail.
 */
var errorCounterFunc = function (jenkinsProject, argString) {
  var args = argString.split(' ');

  args.push('--project', jenkinsProject);
  require('./jake-spec-error-counter').startExternally(args, complete);
};

exports.errorCounterFunc = errorCounterFunc;