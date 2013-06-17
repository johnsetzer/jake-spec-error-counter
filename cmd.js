var sauceErrorCounter = require('./jake-spec-error-counter.js');

sauceErrorCounter.startExternally(process.argv, function () {
  console.log('Done.');
});