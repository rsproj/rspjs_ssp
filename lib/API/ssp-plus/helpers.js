
var cst = require('../../../constants.js');
var Common = require('../../Common.js');

const chalk = require('chalk');
const forEach = require('async/forEach');
const open = require('../../tools/open.js');
const Modules = require('../Modules');

function processesAreAlreadyMonitored(CLI, cb) {
  CLI.Client.executeRemote('getMonitorData', {}, function(err, list) {
    if (err) return cb(false);
    var l = list.filter(l => l.ssp_env.km_link == true)
    var l2 = list.filter(l => l.name == 'ssp-server-monit')

    return cb(l.length > 0 && l2.length > 0 ? true : false)
  })
}

module.exports = function(CLI) {
  CLI.prototype.openDashboard = function() {
    if (!this.gl_interact_infos) {
      Common.printError(chalk.bold.white('Agent if offline, type `$ ssp plus` to log in'));
      return this.exitCli(cst.ERROR_EXIT);
    }

    var uri = `https://app.ssp.io/#/r/${this.gl_interact_infos.public_key}`
    console.log(cst.PM2_IO_MSG + ` Opening ${uri}`)
    open(uri);
    setTimeout(_ => {
      this.exitCli();
    }, 200);
  };

  CLI.prototype.clearSetup = function (opts, cb) {
    const modules = ['event-loop-inspector']
    this.gl_is_km_linked = false

    forEach(modules, (_module, next) => {
      Modules.uninstall(this, _module, () => {
        next()
      });
    }, (err) => {
      this.reload('all', () => {
        return cb()
      })
    })
  }

  /**
   * Install required package and enable flags for current running processes
   */
  CLI.prototype.minimumSetup = function (opts, cb) {
    var self = this;
    this.gl_is_km_linked = true

    function install(cb) {
      var modules = []

      if (opts.type === 'enterprise' || opts.type === 'plus') {
        modules = ['ssp-logrotate', 'ssp-server-monit']
        if (opts.type === 'enterprise') {
          modules.push('deep-metrics')
        }
      }

      forEach(modules, (_module, next) => {
        Modules.install(self, _module, {}, () => {
          next()
        });
      }, (err) => {
        self.reload('all', () => {
          return cb()
        })
      })
    }

    processesAreAlreadyMonitored(self, (already_monitored) => {
      if (already_monitored) {
        console.log(cst.PM2_IO_MSG + ` PM2 ${opts.type || ''} bundle already installed`);
        return cb()
      }

      if (opts.installAll)
        return install(cb)

      // promptly.confirm(chalk.bold('Install all ssp plus dependencies ? (y/n)'), (err, answer) => {
      //   if (!err && answer === true)
      return install(cb)
      // self.reload('all', () => {
      //     return cb()
      //   })
      // });
    })
  }

}
