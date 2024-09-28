

var ssp = require('../..');

ssp.delete('all', function(err) {
  if (err) {
    console.error(err);
    return ssp.disconnect();
  }

  ssp.start('http.js', function(err, app) {
    if (err) {
      console.error(err);
      return ssp.disconnect();
    }

    console.log('Process HTTP has been started');

    ssp.restart('http', function(err, app) {
      if (err) {
        console.error(err);
        return ssp.disconnect();
      }

      console.log('Process Restarted');
      return ssp.disconnect();
    });
  });
});
