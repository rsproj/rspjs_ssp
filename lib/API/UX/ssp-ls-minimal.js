
const UxHelpers = require('./helpers.js')
const p = require('path')

/**
 * Minimal display via ssp ls -m
 * @method miniDisplay
 * @param {Object} list process list
 */
module.exports = function(list) {
  list.forEach(function(l) {

    var mode = l.ssp_env.exec_mode.split('_mode')[0]
    var status = l.ssp_env.status
    var key = l.ssp_env.name || p.basename(l.ssp_env.pm_exec_path.script)

    console.log('+--- %s', key)
    console.log('namespace : %s', l.ssp_env.namespace)
    console.log('version : %s', l.ssp_env.version)
    console.log('pid : %s', l.pid)
    console.log('ssp id : %s', l.ssp_env.pm_id)
    console.log('status : %s', status)
    console.log('mode : %s', mode)
    console.log('restarted : %d', l.ssp_env.restart_time ? l.ssp_env.restart_time : 0)
    console.log('uptime : %s', (l.ssp_env.pm_uptime && status == 'online') ? UxHelpers.timeSince(l.ssp_env.pm_uptime) : 0)
    console.log('memory usage : %s', l.monit ? UxHelpers.bytesToSize(l.monit.memory, 1) : '')
    console.log('error log : %s', l.ssp_env.pm_err_log_path)
    console.log('watching : %s', l.ssp_env.watch ? 'yes' : 'no')
    console.log('PID file : %s\n', l.ssp_env.pm_pid_path)
  })
}
