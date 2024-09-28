


var ssp = require('..');

setTimeout(function() {
  ssp.connect(function() {
    ssp.restart('all', function() {
      ssp.disconnect(function() {

      });
    });
  });
}, 3000);
