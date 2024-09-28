/**
 * Copyright 2013-2022 the PM2 project authors. All rights reserved.
 * Use of this source code is governed by a license that
 * can be found in the LICENSE file.
 */

/******************************
 *    ______ _______ ______
 *   |   __ \   |   |__    |
 *   |    __/       |    __|
 *   |___|  |__|_|__|______|
 *
 *    Main Daemon side file
 *
 ******************************/

var cluster       = require('cluster');
var numCPUs       = require('os').cpus() ? require('os').cpus().length : 1;
var path          = require('path');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var fs            = require('fs');
var vizion        = require('vizion');
var debug         = require('debug')('ssp:god');
var Utility       = require('./Utility');
var cst           = require('../constants.js');
var timesLimit    = require('async/timesLimit');
var Configuration = require('./Configuration.js');

/**
 * Override cluster module configuration
 */
cluster.setupMaster({
  windowsHide: true,
  exec : path.resolve(path.dirname(module.filename), 'ProcessContainer.js')
});

/**
 * Expose God
 */
var God = module.exports = {
  next_id : 0,
  clusters_db : {},
  configuration: {},
  started_at : Date.now(),
  system_infos_proc: null,
  system_infos: null,
  bus : new EventEmitter2({
    wildcard: true,
    delimiter: ':',
    maxListeners: 1000
  })
};

Utility.overrideConsole(God.bus);

/**
 * Populate God namespace
 */
require('./Event.js')(God);
require('./God/Methods.js')(God);
require('./God/ForkMode.js')(God);
require('./God/ClusterMode.js')(God);
require('./God/Reload')(God);
require('./God/ActionMethods')(God);
require('./Watcher')(God);

God.init = function() {
  require('./Worker.js')(this)
  God.system_infos_proc = null

  this.configuration = Configuration.getSync('ssp')

  setTimeout(function() {
    God.Worker.start()
  }, 500)
}

God.writeExitSeparator = function(ssp_env, code, signal) {
  try {
    var exit_sep = `[PM2][${new Date().toISOString()}] app exited`
    if (code)
      exit_sep += `itself with exit code: ${code}`
    if (signal)
      exit_sep += `by an external signal: ${signal}`
    exit_sep += '\n'

    if (ssp_env.pm_out_log_path)
      fs.writeFileSync(ssp_env.pm_out_log_path, exit_sep)
    if (ssp_env.pm_err_log_path)
      fs.writeFileSync(ssp_env.pm_err_log_path, exit_sep)
    if (ssp_env.pm_log_path)
      fs.writeFileSync(ssp_env.pm_log_path, exit_sep)
  } catch(e) {
  }
}

/**
 * Init new process
 */
God.prepare = function prepare (env, cb) {
  // generate a new unique id for each processes
  env.env.unique_id = Utility.generateUUID()

  // if the app is standalone, no multiple instance
  if (typeof env.instances === 'undefined') {
    env.vizion_running = false;
    if (env.env && env.env.vizion_running) env.env.vizion_running = false;

    if (env.status == cst.STOPPED_STATUS) {
      env.pm_id = God.getNewId()
      var clu = {
        ssp_env : env,
        process: {
        }
      }
      God.clusters_db[env.pm_id] = clu
      God.registerCron(env)
      return cb(null, [ God.clusters_db[env.pm_id] ])
    }

    return God.executeApp(env, function (err, clu) {
      if (err) return cb(err);
      God.notify('start', clu, true);
      return cb(null, [ Utility.clone(clu) ]);
    });
  }

  // find how many replicate the user want
  env.instances = parseInt(env.instances);
  if (env.instances === 0) {
    env.instances = numCPUs;
  } else if (env.instances < 0) {
    env.instances += numCPUs;
  }
  if (env.instances <= 0) {
    env.instances = 1;
  }

  timesLimit(env.instances, 1, function (n, next) {
    env.vizion_running = false;
    if (env.env && env.env.vizion_running) {
      env.env.vizion_running = false;
    }

    God.injectVariables(env, function inject (err, _env) {
      if (err) return next(err);
      return God.executeApp(Utility.clone(_env), function (err, clu) {
        if (err) return next(err);
        God.notify('start', clu, true);
        // here call next wihtout an array because
        // async.times aggregate the result into an array
        return next(null, Utility.clone(clu));
      });
    });
  }, cb);
};

/**
 * Launch the specified script (present in env)
 * @api private
 * @method executeApp
 * @param {Mixed} env
 * @param {Function} cb
 * @return Literal
 */
God.executeApp = function executeApp(env, cb) {
  var env_copy = Utility.clone(env);

  Utility.extend(env_copy, env_copy.env);

  env_copy['status']         = env.autostart ? cst.LAUNCHING_STATUS : cst.STOPPED_STATUS;
  env_copy['pm_uptime']      = Date.now();
  env_copy['axm_actions']    = [];
  env_copy['axm_monitor']    = {};
  env_copy['axm_options']    = {};
  env_copy['axm_dynamic']    = {};
  env_copy['vizion_running'] =
    env_copy['vizion_running'] !== undefined ? env_copy['vizion_running'] : false;

  if (!env_copy.created_at)
    env_copy['created_at'] = Date.now();

  /**
   * Enter here when it's the first time that the process is created
   * 1 - Assign a new id
   * 2 - Reset restart time and unstable_restarts
   * 3 - Assign a log file name depending on the id
   * 4 - If watch option is set, look for changes
   */
  if (env_copy['pm_id'] === undefined) {
    env_copy['pm_id']             = God.getNewId();
    env_copy['restart_time']      = 0;
    env_copy['unstable_restarts'] = 0;

    // add -pm_id to pid file
    env_copy.pm_pid_path = env_copy.pm_pid_path.replace(/-[0-9]+\.pid$|\.pid$/g, '-' + env_copy['pm_id'] + '.pid');

    // If merge option, dont separate the logs
    if (!env_copy['merge_logs']) {
      ['', '_out', '_err'].forEach(function(k){
        var key = 'pm' + k + '_log_path';
        env_copy[key] && (env_copy[key] = env_copy[key].replace(/-[0-9]+\.log$|\.log$/g, '-' + env_copy['pm_id'] + '.log'));
      });
    }

    // Initiate watch file
    if (env_copy['watch']) {
      God.watch.enable(env_copy);
    }
  }

  God.registerCron(env_copy)

  if (env_copy['autostart'] === false) {
    var clu = {ssp_env: env_copy, process: {pid: 0}};
    God.clusters_db[env_copy.pm_id] = clu;
    return cb(null, clu);
  }

  /** Callback when application is launched */
  var readyCb = function ready(proc) {
    // If vizion enabled run versioning retrieval system
    if (proc.ssp_env.vizion !== false && proc.ssp_env.vizion !== "false")
      God.finalizeProcedure(proc);
    else
      God.notify('online', proc);

    if (proc.ssp_env.status !== cst.ERRORED_STATUS)
      proc.ssp_env.status = cst.ONLINE_STATUS

    console.log(`App [${proc.ssp_env.name}:${proc.ssp_env.pm_id}] online`);
    if (cb) cb(null, proc);
  }

  if (env_copy.exec_mode === 'cluster_mode') {
    /**
     * Cluster mode logic (for NodeJS apps)
     */
    God.nodeApp(env_copy, function nodeApp(err, clu) {
      if (cb && err) return cb(err);
      if (err) return false;

      var old_env = God.clusters_db[clu.ssp_env.pm_id];

      if (old_env) {
        old_env = null;
        God.clusters_db[clu.ssp_env.pm_id] = null;
      }

      God.clusters_db[clu.ssp_env.pm_id] = clu;

      clu.once('error', function(err) {
        console.error(err.stack || err);
        try {
          clu.destroy && clu.destroy();
        }
        catch (e) {
          console.error(e.stack || e);
          God.handleExit(clu, cst.ERROR_EXIT);
        }
      });

      clu.once('disconnect', function() {
        console.log('App name:%s id:%s disconnected', clu.ssp_env.name, clu.ssp_env.pm_id);
      });

      clu.once('exit', function cluExit(code, signal) {
        //God.writeExitSeparator(clu.ssp_env, code, signal)
        God.handleExit(clu, code || 0, signal || 'SIGINT');
      });

      return clu.once('online', function () {
        if (!clu.ssp_env.wait_ready)
          return readyCb(clu);

        // Timeout if the ready message has not been sent before listen_timeout
        var ready_timeout = setTimeout(function() {
          God.bus.removeListener('process:msg', listener)
          return readyCb(clu)
        }, clu.ssp_env.listen_timeout || cst.GRACEFUL_LISTEN_TIMEOUT);

        var listener = function (packet) {
          if (packet.raw === 'ready' &&
              packet.process.name === clu.ssp_env.name &&
              packet.process.pm_id === clu.ssp_env.pm_id) {
            clearTimeout(ready_timeout);
            God.bus.removeListener('process:msg', listener)
            return readyCb(clu)
          }
        }

        God.bus.on('process:msg', listener);
      });
    });
  }
  else {
    /**
     * Fork mode logic
     */
    God.forkMode(env_copy, function forkMode(err, clu) {
      if (cb && err) return cb(err);
      if (err) return false;

      var old_env = God.clusters_db[clu.ssp_env.pm_id];
      if (old_env) old_env = null;

      God.clusters_db[env_copy.pm_id] = clu;

      clu.once('error', function cluError(err) {
        console.error(err.stack || err);
        try {
          clu.kill && clu.kill();
        }
        catch (e) {
          console.error(e.stack || e);
          God.handleExit(clu, cst.ERROR_EXIT);
        }
      });

      clu.once('exit', function cluClose(code, signal) {
        //God.writeExitSeparator(clu.ssp_env, code, signal)

        if (clu.connected === true)
          clu.disconnect && clu.disconnect();
        clu._reloadLogs = null;
        return God.handleExit(clu, code || 0, signal);
      });

      if (!clu.ssp_env.wait_ready)
        return readyCb(clu);

      // Timeout if the ready message has not been sent before listen_timeout
      var ready_timeout = setTimeout(function() {
        God.bus.removeListener('process:msg', listener)
        return readyCb(clu)
      }, clu.ssp_env.listen_timeout || cst.GRACEFUL_LISTEN_TIMEOUT);

      var listener = function (packet) {
        if (packet.raw === 'ready' &&
            packet.process.name === clu.ssp_env.name &&
            packet.process.pm_id === clu.ssp_env.pm_id) {
          clearTimeout(ready_timeout);
          God.bus.removeListener('process:msg', listener)
          return readyCb(clu)
        }
      }
      God.bus.on('process:msg', listener);
    });
  }
  return false;
};

/**
 * Handle logic when a process exit (Node or Fork)
 * @method handleExit
 * @param {} clu
 * @param {} exit_code
 * @return
 */
God.handleExit = function handleExit(clu, exit_code, kill_signal) {
  console.log(`App [${clu.ssp_env.name}:${clu.ssp_env.pm_id}] exited with code [${exit_code}] via signal [${kill_signal || 'SIGINT'}]`)

  var proc = this.clusters_db[clu.ssp_env.pm_id];

  if (!proc) {
    console.error('Process undefined ? with process id ', clu.ssp_env.pm_id);
    return false;
  }

  var stopExitCodes = proc.ssp_env.stop_exit_codes !== undefined && proc.ssp_env.stop_exit_codes !== null ? proc.ssp_env.stop_exit_codes : [];
  if (!Array.isArray(stopExitCodes)) {
    stopExitCodes = [stopExitCodes];
  }

  var stopping = (proc.ssp_env.status == cst.STOPPING_STATUS
                  || proc.ssp_env.status == cst.STOPPED_STATUS
                  || proc.ssp_env.status == cst.ERRORED_STATUS)
      || (proc.ssp_env.autorestart === false || proc.ssp_env.autorestart === "false")
      || (stopExitCodes.map((strOrNum) => typeof strOrNum === 'string' ? parseInt(strOrNum, 10) : strOrNum)
      .includes(exit_code));

  var overlimit   = false;

  if (stopping) proc.process.pid = 0;

  // Reset probes and actions
  if (proc.ssp_env.axm_actions) proc.ssp_env.axm_actions = [];
  if (proc.ssp_env.axm_monitor) proc.ssp_env.axm_monitor = {};

  if (proc.ssp_env.status != cst.ERRORED_STATUS &&
      proc.ssp_env.status != cst.STOPPING_STATUS)
    proc.ssp_env.status = cst.STOPPED_STATUS;

  if (proc.ssp_env.pm_id.toString().indexOf('_old_') !== 0) {
    try {
      fs.unlinkSync(proc.ssp_env.pm_pid_path);
    } catch (e) {
      debug('Error when unlinking pid file', e);
    }
  }

  /**
   * Avoid infinite reloop if an error is present
   */
  // If the process has been created less than 15seconds ago

  // And if the process has an uptime less than a second
  var min_uptime = typeof(proc.ssp_env.min_uptime) !== 'undefined' ? proc.ssp_env.min_uptime : 1000;
  var max_restarts = typeof(proc.ssp_env.max_restarts) !== 'undefined' ? proc.ssp_env.max_restarts : 16;

  if ((Date.now() - proc.ssp_env.created_at) < (min_uptime * max_restarts)) {
    if ((Date.now() - proc.ssp_env.pm_uptime) < min_uptime) {
      // Increment unstable restart
      proc.ssp_env.unstable_restarts += 1;
    }
  }


  if (proc.ssp_env.unstable_restarts >= max_restarts) {
    // Too many unstable restart in less than 15 seconds
    // Set the process as 'ERRORED'
    // And stop restarting it
    proc.ssp_env.status = cst.ERRORED_STATUS;
    proc.process.pid = 0;

    console.log('Script %s had too many unstable restarts (%d). Stopped. %j',
      proc.ssp_env.pm_exec_path,
      proc.ssp_env.unstable_restarts,
      proc.ssp_env.status);

    God.notify('restart overlimit', proc);

    proc.ssp_env.unstable_restarts = 0;
    proc.ssp_env.created_at = null;
    overlimit = true;
  }

  if (typeof(exit_code) !== 'undefined') proc.ssp_env.exit_code = exit_code;

  God.notify('exit', proc);

  if (God.ssp_being_killed) {
    //console.log('[HandleExit] PM2 is being killed, stopping restart procedure...');
    return false;
  }

  var restart_delay = 0;

  if (proc.ssp_env.restart_delay !== undefined &&
      !isNaN(parseInt(proc.ssp_env.restart_delay))) {
    proc.ssp_env.status = cst.WAITING_RESTART;
    restart_delay = parseInt(proc.ssp_env.restart_delay);
  }

  if (proc.ssp_env.exp_backoff_restart_delay !== undefined &&
      !isNaN(parseInt(proc.ssp_env.exp_backoff_restart_delay))) {
    proc.ssp_env.status = cst.WAITING_RESTART;
    if (!proc.ssp_env.prev_restart_delay) {
      proc.ssp_env.prev_restart_delay = proc.ssp_env.exp_backoff_restart_delay
      restart_delay = proc.ssp_env.exp_backoff_restart_delay
    }
    else {
      proc.ssp_env.prev_restart_delay = Math.floor(Math.min(15000, proc.ssp_env.prev_restart_delay * 1.5))
      restart_delay = proc.ssp_env.prev_restart_delay
    }
    console.log(`App [${clu.ssp_env.name}:${clu.ssp_env.pm_id}] will restart in ${restart_delay}ms`)
  }

  if (!stopping && !overlimit) {
    //make this property unenumerable
    Object.defineProperty(proc.ssp_env, 'restart_task', {configurable: true, writable: true});
    proc.ssp_env.restart_task = setTimeout(function() {
      proc.ssp_env.restart_time += 1;
      God.executeApp(proc.ssp_env);
    }, restart_delay);
  }

  return false;
};

/**
 * @method finalizeProcedure
 * @param proc {Object}
 * @return
 */
God.finalizeProcedure = function finalizeProcedure(proc) {
  var last_path    = '';
  var current_path = proc.ssp_env.cwd || path.dirname(proc.ssp_env.pm_exec_path);
  var proc_id      = proc.ssp_env.pm_id;

  proc.ssp_env.version = Utility.findPackageVersion(proc.ssp_env.pm_exec_path || proc.ssp_env.cwd);

  if (proc.ssp_env.vizion_running === true) {
    debug('Vizion is already running for proc id: %d, skipping this round', proc_id);
    return God.notify('online', proc);
  }
  proc.ssp_env.vizion_running = true;

  vizion.analyze({folder : current_path}, function recur_path(err, meta){
    var proc = God.clusters_db[proc_id];

    if (err)
      debug(err.stack || err);

    if (!proc ||
        !proc.ssp_env ||
        proc.ssp_env.status == cst.STOPPED_STATUS ||
        proc.ssp_env.status == cst.STOPPING_STATUS ||
        proc.ssp_env.status == cst.ERRORED_STATUS) {
      return console.error('Cancelling versioning data parsing');
    }

    proc.ssp_env.vizion_running = false;

    if (!err) {
      proc.ssp_env.versioning = meta;
      proc.ssp_env.versioning.repo_path = current_path;
      God.notify('online', proc);
    }
    else if (err && current_path === last_path) {
      proc.ssp_env.versioning = null;
      God.notify('online', proc);
    }
    else {
      last_path = current_path;
      current_path = path.dirname(current_path);
      proc.ssp_env.vizion_running = true;
      vizion.analyze({folder : current_path}, recur_path);
    }
    return false;
  });
};

/**
 * Inject variables into processes
 * @param {Object} env environnement to be passed to the process
 * @param {Function} cb invoked with <err, env>
 */
God.injectVariables = function injectVariables (env, cb) {
  // allow to override the key of NODE_APP_INSTANCE if wanted
  var instanceKey = process.env.PM2_PROCESS_INSTANCE_VAR || env.instance_var;

  // we need to find the last NODE_APP_INSTANCE used
  var instances = Object.keys(God.clusters_db)
    .map(function (procId) {
      return God.clusters_db[procId];
    }).filter(function (proc) {
      return proc.ssp_env.name === env.name &&
        typeof proc.ssp_env[instanceKey] !== 'undefined';
    }).map(function (proc) {
      return proc.ssp_env[instanceKey];
    }).sort(function (a, b) {
      return b - a;
    });
  // default to last one + 1
  var instanceNumber = typeof instances[0] === 'undefined' ? 0 : instances[0] + 1;
  // but try to find a one available
  for (var i = 0; i < instances.length; i++) {
    if (instances.indexOf(i) === -1) {
      instanceNumber = i;
      break;
    }
  }
  env[instanceKey] = instanceNumber;

  // if using increment_var, we need to increment it
  if (env.increment_var) {
    var lastIncrement = Object.keys(God.clusters_db)
      .map(function (procId) {
        return God.clusters_db[procId];
      }).filter(function (proc) {
        return proc.ssp_env.name === env.name &&
          typeof proc.ssp_env[env.increment_var] !== 'undefined';
      }).map(function (proc) {
        return Number(proc.ssp_env[env.increment_var]);
      }).sort(function (a, b) {
        return b - a;
      })[0];
    // inject a incremental variable
    var defaut = Number(env.env[env.increment_var]) || 0;
    env[env.increment_var] = typeof lastIncrement === 'undefined' ? defaut : lastIncrement + 1;
    env.env[env.increment_var] = env[env.increment_var];
  }

  return cb(null, env);
};

God.init()
