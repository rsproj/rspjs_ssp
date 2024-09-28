/**
 * Copyright 2013-2022 the PM2 project authors. All rights reserved.
 * Use of this source code is governed by a license that
 * can be found in the LICENSE file.
 */
'use strict';

/**
 * @file Fork execution related functions
 * @author Alexandre Strzelewicz <as@unitech.io>
 * @project PM2
 */
var log           = require('debug')('ssp:fork_mode');
var fs            = require('fs');
var Utility       = require('../Utility.js');
var path          = require('path');
var dayjs         = require('dayjs');
var semver  = require('semver')

/**
 * Description
 * @method exports
 * @param {} God
 * @return
 */
module.exports = function ForkMode(God) {
  /**
   * For all apps - FORK MODE
   * fork the app
   * @method forkMode
   * @param {} ssp_env
   * @param {} cb
   * @return
   */
  God.forkMode = function forkMode(ssp_env, cb) {
    var command = '';
    var args    = [];

    console.log(`App [${ssp_env.name}:${ssp_env.pm_id}] starting in -fork mode-`)
    var spawn = require('child_process').spawn;

    var interpreter = ssp_env.exec_interpreter || 'node';
    var pidFile     = ssp_env.pm_pid_path;

    if (interpreter !== 'none') {
      command = interpreter;

      if (ssp_env.node_args && Array.isArray(ssp_env.node_args)) {
        args = args.concat(ssp_env.node_args);
      }

      // Deprecated - to remove at some point
      if (process.env.PM2_NODE_OPTIONS) {
        args = args.concat(process.env.PM2_NODE_OPTIONS.split(' '));
      }

      if (interpreter === 'node' || RegExp('node$').test(interpreter)) {
        args.push(path.resolve(path.dirname(module.filename), '..', 'ProcessContainerFork.js'));
      }
      else
        args.push(ssp_env.pm_exec_path);
    }
    else {
      command = ssp_env.pm_exec_path;
      args = [ ];
    }

    if (ssp_env.args) {
      args = args.concat(ssp_env.args);
    }

    // piping stream o file
    var stds = {
      out: ssp_env.pm_out_log_path,
      err: ssp_env.pm_err_log_path
    };

    // entire log std if necessary.
    if ('pm_log_path' in ssp_env){
      stds.std = ssp_env.pm_log_path;
    }

    log("stds: %j", stds);

    Utility.startLogging(stds, function(err, result) {
      if (err) {
        God.logAndGenerateError(err);
        return cb(err);
      };

      try {
        var options = {
          env      : ssp_env,
          detached : true,
          cwd      : ssp_env.pm_cwd || process.cwd(),
          stdio    : ['pipe', 'pipe', 'pipe', 'ipc'] //Same as fork() in node core
        }

        if (typeof(ssp_env.windowsHide) === "boolean") {
          options.windowsHide = ssp_env.windowsHide;
        } else {
          options.windowsHide = true;
        }

        if (ssp_env.uid) {
          options.uid = ssp_env.uid
        }

        if (ssp_env.gid) {
          options.gid = ssp_env.gid
        }

        var cspr = spawn(command, args, options);
      } catch(e) {
        God.logAndGenerateError(e);
        return cb(e);
      }

      if (!cspr || !cspr.stderr || !cspr.stdout) {
        var fatalError = new Error('Process could not be forked properly, check your system health')
        God.logAndGenerateError(fatalError);
        return cb(fatalError);
      }

      cspr.process = {};
      cspr.process.pid = cspr.pid;
      cspr.ssp_env = ssp_env;

      function transformLogToJson(ssp_env, type, data) {
        return JSON.stringify({
          message : data.toString(),
          timestamp : ssp_env.log_date_format ? dayjs().format(ssp_env.log_date_format) : new Date().toISOString(),
          type : type,
          process_id : cspr.ssp_env.pm_id,
          app_name : cspr.ssp_env.name
        }) + '\n'
      }

      function prefixLogWithDate(ssp_env, data) {
        var log_data = []
        log_data = data.toString().split('\n')
        if (log_data.length > 1)
          log_data.pop()
        log_data = log_data.map(line => `${dayjs().format(ssp_env.log_date_format)}: ${line}\n`)
        log_data = log_data.join('')
        return log_data
      }

      cspr.stderr.on('data', function forkErrData(data) {
        var log_data = null;

        // via --out /dev/null --err /dev/null
        if (ssp_env.disable_logs === true) return false;

        if (ssp_env.log_type && ssp_env.log_type === 'json')
          log_data = transformLogToJson(ssp_env, 'err', data)
        else if (ssp_env.log_date_format)
          log_data = prefixLogWithDate(ssp_env, data)
        else
          log_data = data.toString();

        God.bus.emit('log:err', {
          process : {
            pm_id      : cspr.ssp_env.pm_id,
            name       : cspr.ssp_env.name,
            rev        : (cspr.ssp_env.versioning && cspr.ssp_env.versioning.revision) ? cspr.ssp_env.versioning.revision : null,
            namespace  : cspr.ssp_env.namespace
          },
          at  : Utility.getDate(),
          data : log_data
        });

        if (Utility.checkPathIsNull(ssp_env.pm_err_log_path) &&
          (!ssp_env.pm_log_path || Utility.checkPathIsNull(ssp_env.pm_log_path))) {
          return false;
        }

        stds.std && stds.std.write && stds.std.write(log_data);
        stds.err && stds.err.write && stds.err.write(log_data);
      });

      cspr.stdout.on('data', function forkOutData(data) {
        var log_data = null;

        if (ssp_env.disable_logs === true)
          return false;

        if (ssp_env.log_type && ssp_env.log_type === 'json')
          log_data = transformLogToJson(ssp_env, 'out', data)
        else if (ssp_env.log_date_format)
          log_data = prefixLogWithDate(ssp_env, data)
        else
          log_data = data.toString()

        God.bus.emit('log:out', {
          process : {
            pm_id      : cspr.ssp_env.pm_id,
            name       : cspr.ssp_env.name,
            rev        : (cspr.ssp_env.versioning && cspr.ssp_env.versioning.revision) ? cspr.ssp_env.versioning.revision : null,
            namespace  : cspr.ssp_env.namespace
          },
          at  : Utility.getDate(),
          data : log_data
        });

        if (Utility.checkPathIsNull(ssp_env.pm_out_log_path) &&
          (!ssp_env.pm_log_path || Utility.checkPathIsNull(ssp_env.pm_log_path)))
          return false;

        stds.std && stds.std.write && stds.std.write(log_data);
        stds.out && stds.out.write && stds.out.write(log_data);
      });

      /**
       * Broadcast message to God
       */
      cspr.on('message', function forkMessage(msg) {
        /*********************************
         * If you edit this function
         * Do the same in ClusterMode.js !
         *********************************/
        if (msg.data && msg.type) {
          process.nextTick(function() {
            return God.bus.emit(msg.type ? msg.type : 'process:msg', {
              at      : Utility.getDate(),
              data    : msg.data,
              process : {
                pm_id      : cspr.ssp_env.pm_id,
                name       : cspr.ssp_env.name,
                versioning : cspr.ssp_env.versioning,
                namespace  : cspr.ssp_env.namespace
              }
            });
          });
        }
        else {

          if (typeof msg == 'object' && 'node_version' in msg) {
            cspr.ssp_env.node_version = msg.node_version;
            return false;
          }

          return God.bus.emit('process:msg', {
            at      : Utility.getDate(),
            raw     : msg,
            process :  {
              pm_id      : cspr.ssp_env.pm_id,
              name       : cspr.ssp_env.name,
              namespace  : cspr.ssp_env.namespace
            }
          });
        }
      });

      try {
        var pid = cspr.pid
        if (typeof(pid) !== 'undefined')
          fs.writeFileSync(pidFile, pid.toString());
      } catch (e) {
        console.error(e.stack || e);
      }

      cspr.once('exit', function forkClose(status) {
        try {
          for(var k in stds){
            if (stds[k] && stds[k].destroy) stds[k].destroy();
            else if (stds[k] && stds[k].end) stds[k].end();
            else if (stds[k] && stds[k].close) stds[k].close();
            stds[k] = stds[k]._file;
          }
        } catch(e) { God.logAndGenerateError(e);}
      });

      cspr._reloadLogs = function(cb) {
        try {
          for (var k in stds){
            if (stds[k] && stds[k].destroy) stds[k].destroy();
            else if (stds[k] && stds[k].end) stds[k].end();
            else if (stds[k] && stds[k].close) stds[k].close();
            stds[k] = stds[k]._file;
          }
        } catch(e) { God.logAndGenerateError(e);}
        //cspr.removeAllListeners();
        Utility.startLogging(stds, cb);
      };

      cspr.unref();

      return cb(null, cspr);
    });

  };
};
