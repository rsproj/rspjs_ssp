/**
 * Copyright 2013-2022 the PM2 project authors. All rights reserved.
 * Use of this source code is governed by a license that
 * can be found in the LICENSE file.
 */
var chokidar = require('chokidar');
var util     = require('util');
var log      = require('debug')('ssp:watch');

module.exports = function ClusterMode(God) {
  /**
   * Watch folder for changes and restart
   * @method watch
   * @param {Object} ssp_env ssp app environnement
   * @return MemberExpression
   */
  God.watch = {};

  God.watch._watchers = {};

  God.watch.enable = function(ssp_env) {
    if (God.watch._watchers[ssp_env.pm_id]) {
      God.watch._watchers[ssp_env.pm_id].close();
      God.watch._watchers[ssp_env.pm_id] = null;
      delete God.watch._watchers[ssp_env.pm_id];
    }

    log('Initial watch ', ssp_env.watch)

    var watch = ssp_env.watch

    if(typeof watch == 'boolean' || Array.isArray(watch) && watch.length === 0)
      watch = ssp_env.pm_cwd;

    log('Watching %s', watch);

    var watch_options = {
      ignored       : ssp_env.ignore_watch || /[\/\\]\.|node_modules/,
      persistent    : true,
      ignoreInitial : true,
      cwd: ssp_env.pm_cwd
    };

    if (ssp_env.watch_options) {
      watch_options = Object.assign(watch_options, ssp_env.watch_options);
    }

    log('Watch opts', watch_options);

    var watcher = chokidar.watch(watch, watch_options);

    console.log('[Watch] Start watching', ssp_env.name);

    watcher.on('all', function(event, path) {
      var self = this;

      if (self.restarting === true) {
        log('Already restarting, skipping');
        return false;
      }

      self.restarting = true;

      console.log('Change detected on path %s for app %s - restarting', path, ssp_env.name);

      setTimeout(function() {
        God.restartProcessName(ssp_env.name, function(err, list) {
          self.restarting = false;

          if (err) {
            log('Error while restarting', err);
            return false;
          }

          return log('Process restarted');
        });
      }, (ssp_env.watch_delay || 0));

      return false;
    });

    watcher.on('error', function(e) {
      console.error(e.stack || e);
    });

    God.watch._watchers[ssp_env.pm_id] = watcher;

    //return God.watch._watchers[ssp_env.name];
  },
  /**
   * Description
   * @method close
   * @param {} id
   * @return
   */
  God.watch.disableAll = function() {
    var watchers = God.watch._watchers;

    console.log('[Watch] PM2 is being killed. Watch is disabled to avoid conflicts');
    for (var i in watchers) {
      watchers[i].close && watchers[i].close();
      watchers.splice(i, 1);
    }
  },

  God.watch.disable = function(ssp_env) {
    var watcher = God.watch._watchers[ssp_env.pm_id]
    if (watcher) {
      console.log('[Watch] Stop watching', ssp_env.name);
      watcher.close();
      delete God.watch._watchers[ssp_env.pm_id];
      return true;
    } else {
      return false;
    }
  }
};
