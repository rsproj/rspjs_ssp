
var ssp = require('..');

var MACHINE_NAME = 'hk1';
var PRIVATE_KEY  = 'z1ormi95vomgq66';
var PUBLIC_KEY   = 'oa0m7nuhdfibi16';

ssp.connect(true, function() {
  ssp.start({
    script : '../test/fixtures/child.js',
    name : 'production-app'
  }, function() {
    ssp.interact(PRIVATE_KEY, PUBLIC_KEY, MACHINE_NAME, function() {
    });
  });
});
