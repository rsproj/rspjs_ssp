
Here is an example on using ssp inside container with the official image and ssp-runtime.

To build & run it:

```bash
# build image
$ docker build -t docker-ssp-test .
# list images
$ docker images
# run image
$ docker run docker-ssp-test
```

There is also KEYMETRICS integration via KEYMETRICS_SECRET and KEYMETRICS_PUBLIC keys
