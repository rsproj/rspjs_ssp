### Commands Cheatsheet

<details>
  <summary>Commands Cheatsheet</summary>

```bash
# General
$ npm install ssp -g            # Install PM2
$ ssp start app.js              # Start, Daemonize and auto-restart application (Node)
$ ssp start app.py              # Start, Daemonize and auto-restart application (Python)
$ ssp start npm -- start        # Start, Daemonize and auto-restart Node application

# Cluster Mode (Node.js only)
$ ssp start app.js -i 4         # Start 4 instances of application in cluster mode
                                # it will load balance network queries to each app
$ ssp reload all                # Zero Second Downtime Reload
$ ssp scale [app-name] 10       # Scale Cluster app to 10 process

# Process Monitoring
$ ssp list                      # List all processes started with PM2
$ ssp list --sort=<field>       # Sort all processes started with PM2
$ ssp monit                     # Display memory and cpu usage of each app
$ ssp show [app-name]           # Show all information about application

# Log management
$ ssp logs                      # Display logs of all apps
$ ssp logs [app-name]           # Display logs for a specific app
$ ssp logs --json               # Logs in JSON format
$ ssp flush
$ ssp reloadLogs

# Process State Management
$ ssp start app.js --name="api" # Start application and name it "api"
$ ssp start app.js -- -a 34     # Start app and pass option "-a 34" as argument
$ ssp start app.js --watch      # Restart application on file change
$ ssp start script.sh           # Start bash script
$ ssp start app.json            # Start all applications declared in app.json
$ ssp reset [app-name]          # Reset all counters
$ ssp stop all                  # Stop all apps
$ ssp stop 0                    # Stop process with id 0
$ ssp restart all               # Restart all apps
$ ssp delete all                # Kill and delete all apps
$ ssp delete 0                  # Delete app with id 0

# Startup/Boot management
$ ssp startup                   # Detect init system, generate and configure ssp boot on startup
$ ssp save                      # Save current process list
$ ssp resurrect                 # Restore previously saved processes
$ ssp unstartup                 # Disable and remove startup system

$ ssp update                    # Save processes, kill PM2 and restore processes
$ ssp init                      # Generate a sample js configuration file

# Deployment
$ ssp deploy app.json prod setup    # Setup "prod" remote server
$ ssp deploy app.json prod          # Update "prod" remote server
$ ssp deploy app.json prod revert 2 # Revert "prod" remote server by 2

# Module system
$ ssp module:generate [name]    # Generate sample module with name [name]
$ ssp install ssp-logrotate     # Install module (here a log rotation system)
$ ssp uninstall ssp-logrotate   # Uninstall module
$ ssp publish                   # Increment version, git push and npm publish
```

</details>

Also check out the [example folder](https://github.com/Unitech/ssp/tree/master/examples) to discover all features.
