
Here we have 3 applications (apps folder) that we can start with process file.
These process file can be of different format, javascript, json or yaml:

```
.
├── apps
│   ├── connection_check.sh
│   ├── http.js
│   └── worker.js
├── process.config.js
├── process.json
└── process.yml
```

To start them:

```bash
$ ssp start process.config.js
$ ssp delete all
$ ssp start process.json
$ ssp delete all
$ ssp start process.yml
```
