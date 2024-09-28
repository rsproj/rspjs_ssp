
This is a sample module that have been generate via `ssp module:generate`:

```
>>> ssp module:generate
[PM2] Spawning PM2 daemon with ssp_home=/home/unitech/.ssp
[PM2] PM2 Successfully daemonized
[PM2][Module] Module name: module-test
[PM2][Module] Getting sample app
Cloning into 'module-test'...

npm notice created a lockfile as package-lock.json. You should commit this file.
added 4 packages in 0.939s

[PM2][Module] Module sample created in folder:  /home/unitech/keymetrics/ssp/examples/module-test

Start module in development mode:
$ cd module-test/
$ ssp install .

Module Log:
$ ssp logs module-test

Uninstall module:
$ ssp uninstall module-test

Force restart:
$ ssp restart module-test
```

## Configuration

To add configuration to the module:

```
$ ssp set module-test:var1 value1
```

You will then be able to access to this value via

```bash
pmx.initModule({
}, function(err, conf) {
  // var1 = value1
  console.log(conf.var1);
});
```
