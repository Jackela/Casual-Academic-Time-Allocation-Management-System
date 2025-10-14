const { runNpmScript } = require('./tools/scripts/lib/test-runner');
runNpmScript('frontend','test:unit')
  .then(() => console.log('done'))
  .catch(err => console.error('ERR', err));
