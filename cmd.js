var errorCounter = require('./jake-spec-error-counter.js');

errorCounter.startExternally(process.argv, function () {
  console.log('Done.');
});