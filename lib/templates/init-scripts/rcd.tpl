#!/bin/sh

# PROVIDE: ssp
# REQUIRE: LOGIN
# KEYWORD: shutdown

. /etc/rc.subr

name="%SERVICE_NAME%"
rcvar="%SERVICE_NAME%_enable"

start_cmd="ssp_start"
stop_cmd="ssp_stop"
reload_cmd="ssp_reload"
status_cmd="ssp_status"
extra_commands="reload status"

ssp()
{
  env PATH="$PATH:%NODE_PATH%" PM2_HOME="%HOME_PATH%" su -m "%USER%" -c "%PM2_PATH% $*"
}

ssp_start()
{
  ssp resurrect
}

ssp_stop()
{
  ssp kill
}

ssp_reload()
{
  ssp reload all
}

ssp_status()
{
  ssp list
}

load_rc_config $name
run_rc_command "$1"
