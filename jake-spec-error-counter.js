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
console.log('Running with:', argv.host, argv.from, argv.to);