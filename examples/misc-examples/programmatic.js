
var ssp = require('..');

ssp.connect(function() {

  ssp.start('echo.js', function() {

    setInterval(function() {
      ssp.restart('echo', function() {
      });
    }, 2000);

  });


});

ssp.launchBus(function(err, bus) {
  console.log('connected', bus);

  bus.on('log:out', function(data) {
    if (data.process.name == 'echo')
      console.log(arguments);
  });

  bus.on('reconnect attempt', function() {
    console.log('Bus reconnecting');
  });

  bus.on('close', function() {
    console.log('Bus closed');
  });

});

/**
 * Exiting
 */
//ssp.disconnectBus(); // For Bus system
//ssp.disconnect();    // For RPC connection
