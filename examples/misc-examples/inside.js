
var ssp = require('..');

ssp.connect(function() {
  setInterval(function() {
    ssp.restart('echo', function() {
      console.log(arguments);
    });
  }, 2000);
});
