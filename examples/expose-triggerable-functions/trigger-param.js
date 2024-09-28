var ssp = require('../..');

ssp.trigger('0', 'param', { some : 'data' }, function(err, res) {
  var rep_1 = res[0];
  console.log(`Got result from ${rep_1.process.name}`);
  console.log(rep_1.data);

  ssp.disconnect();
});
