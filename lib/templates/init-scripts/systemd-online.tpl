[Unit]
Description=PM2 process manager
Documentation=https://ssp.keymetrics.io/
After=network-online.target
Restart=on-failure

[Service]
Type=forking
User=%USER%
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=%NODE_PATH%:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=%HOME_PATH%
PIDFile=%HOME_PATH%/ssp.pid

ExecStart=%PM2_PATH% resurrect
ExecReload=%PM2_PATH% reload all
ExecStop=%PM2_PATH% kill

[Install]
WantedBy=network-online.target
