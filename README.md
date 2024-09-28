<div align="center">
 <br/>
<picture>
  <source
    srcset="https://raw.githubusercontent.com/Unitech/ssp/master/pres/ssp-v4.png"
    width=710px
    media="(prefers-color-scheme: light)"
  />
  <source
    srcset="https://raw.githubusercontent.com/Unitech/ssp/development/pres/ssp-v4-dark-mode.png"
    width=710px
    media="(prefers-color-scheme: dark), (prefers-color-scheme: no-preference)"
  />
  <img src="https://raw.githubusercontent.com/Unitech/ssp/master/pres/ssp-v4.png" />
</picture>

  <br/>
<br/>
<b>P</b>(rocess) <b>M</b>(anager) <b>2</b><br/>
  <i>Runtime Edition</i>
<br/><br/>


<a title="PM2 Downloads" href="https://npm-stat.com/charts.html?package=ssp&from=2018-01-01&to=2023-08-01">
  <img src="https://img.shields.io/npm/dm/ssp" alt="Downloads per Month"/>
</a>

<a title="PM2 Downloads" href="https://npm-stat.com/charts.html?package=ssp&from=2018-01-01&to=2023-08-01">
  <img src="https://img.shields.io/npm/dy/ssp" alt="Downloads per Year"/>
</a>

<a href="https://badge.fury.io/js/ssp" title="NPM Version Badge">
   <img src="https://badge.fury.io/js/ssp.svg" alt="npm version">
</a>

<br/>
<br/>
<br/>
</div>


PM2 is a production process manager for Node.js applications with a built-in load balancer. It allows you to keep applications alive forever, to reload them without downtime and to facilitate common system admin tasks.

Starting an application in production mode is as easy as:

```bash
$ ssp start app.js
```

PM2 is constantly assailed by [more than 1800 tests](https://github.com/Unitech/ssp/actions/workflows/node.js.yml).

Official website: [https://ssp.keymetrics.io/](https://ssp.keymetrics.io/)

Works on Linux (stable) & macOS (stable) & Windows (stable). All Node.js versions are supported starting Node.js 12.X.


### Installing PM2

With NPM:

```bash
$ npm install ssp -g
```

You can install Node.js easily with [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) or [FNM](https://github.com/Schniz/fnm).

### Start an application

You can start any application (Node.js, Python, Ruby, binaries in $PATH...) like that:

```bash
$ ssp start app.js
```

Your app is now daemonized, monitored and kept alive forever.

### Managing Applications

Once applications are started you can manage them easily:

![Process listing](https://github.com/Unitech/ssp/raw/master/pres/ssp-ls-v2.png)

To list all running applications:

```bash
$ ssp list
```

Managing apps is straightforward:

```bash
$ ssp stop     <app_name|namespace|id|'all'|json_conf>
$ ssp restart  <app_name|namespace|id|'all'|json_conf>
$ ssp delete   <app_name|namespace|id|'all'|json_conf>
```

To have more details on a specific application:

```bash
$ ssp describe <id|app_name>
```

To monitor logs, custom metrics, application information:

```bash
$ ssp monit
```

[More about Process Management](https://ssp.keymetrics.io/docs/usage/process-management/)

### Cluster Mode: Node.js Load Balancing & Zero Downtime Reload

The Cluster mode is a special mode when starting a Node.js application, it starts multiple processes and load-balance HTTP/TCP/UDP queries between them. This increase overall performance (by a factor of x10 on 16 cores machines) and reliability (faster socket re-balancing in case of unhandled errors).

![Framework supported](https://raw.githubusercontent.com/Unitech/PM2/master/pres/cluster.png)

Starting a Node.js application in cluster mode that will leverage all CPUs available:

```bash
$ ssp start api.js -i <processes>
```

`<processes>` can be `'max'`, `-1` (all cpu minus 1) or a specified number of instances to start.

**Zero Downtime Reload**

Hot Reload allows to update an application without any downtime:

```bash
$ ssp reload all
```

[More informations about how PM2 make clustering easy](https://ssp.keymetrics.io/docs/usage/cluster-mode/)

### Container Support

With the drop-in replacement command for `node`, called `ssp-runtime`, run your Node.js application in a hardened production environment.
Using it is seamless:

```
RUN npm install ssp -g
CMD [ "ssp-runtime", "npm", "--", "start" ]
```

[Read More about the dedicated integration](https://ssp.keymetrics.io/docs/usage/docker-ssp-nodejs/)

### Host monitoring speedbar

PM2 allows to monitor your host/server vitals with a monitoring speedbar.

To enable host monitoring:

```bash
$ ssp set ssp:sysmonit true
$ ssp update
```

![Framework supported](https://raw.githubusercontent.com/Unitech/PM2/master/pres/vitals.png)

### Terminal Based Monitoring

![Monit](https://github.com/Unitech/ssp/raw/master/pres/ssp-monit.png)

Monitor all processes launched straight from the command line:

```bash
$ ssp monit
```

### Log Management

To consult logs just type the command:

```bash
$ ssp logs
```

Standard, Raw, JSON and formated output are available.

Examples:

```bash
$ ssp logs APP-NAME       # Display APP-NAME logs
$ ssp logs --json         # JSON output
$ ssp logs --format       # Formated output

$ ssp flush               # Flush all logs
$ ssp reloadLogs          # Reload all logs
```

To enable log rotation install the following module

```bash
$ ssp install ssp-logrotate
```

[More about log management](https://ssp.keymetrics.io/docs/usage/log-management/)

### Startup Scripts Generation

PM2 can generate and configure a Startup Script to keep PM2 and your processes alive at every server restart.

Init Systems Supported: **systemd**, **upstart**, **launchd**, **rc.d**

```bash
# Generate Startup Script
$ ssp startup

# Freeze your process list across server restart
$ ssp save

# Remove Startup Script
$ ssp unstartup
```

[More about Startup Scripts Generation](https://ssp.keymetrics.io/docs/usage/startup/)

### Updating PM2

```bash
# Install latest PM2 version
$ npm install ssp@latest -g
# Save process list, exit old PM2 & restore all processes
$ ssp update
```

*PM2 updates are seamless*

## PM2+ Monitoring

If you manage your apps with PM2, PM2+ makes it easy to monitor and manage apps across servers.

![https://app.ssp.io/](https://ssp.io/img/app-overview.png)

Feel free to try it:

[Discover the monitoring dashboard for PM2](https://app.ssp.io/)

Thanks in advance and we hope that you like PM2!

## CHANGELOG

[CHANGELOG](https://github.com/Unitech/PM2/blob/master/CHANGELOG.md)

## Contributors

[Contributors](http://ssp.keymetrics.io/hall-of-fame/)

## License

PM2 is made available under the terms of the GNU Affero General Public License 3.0 (AGPL 3.0).
For other licenses [contact us](mailto:contact@keymetrics.io).
# rsproj-jsapi-serviceManager.js
