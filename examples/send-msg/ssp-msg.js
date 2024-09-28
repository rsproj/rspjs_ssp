
const ssp = require('../..')

console.log(ssp)

ssp.connect(function() {
  ssp.sendDataToProcessId({
    // id of procces from "ssp list" command or from ssp.list(errback) method
    id   : '1',

    // process:msg will be send as 'message' on target process
    type : 'process:msg',

    // Data to be sent
    data : {
      some : 'data'
    },

    topic: true
  }, function(err, res) {
  })
})

// Listen to messages from application
ssp.launchBus(function(err, ssp_bus) {
  ssp_bus.on('process:msg', function(packet) {
    console.log(packet)
  })
})
