

var ssp = require('..');

ssp.connect(function() {
  ssp.start(__dirname + '/args.js', {
    scriptArgs : ['-i', 'sisi', '-x', 'toto']
  }, function(err, res) {
    console.log(arguments);
  });
});
