#!/bin/sh

set -ex

#npm run build
npm pack
rm -rf dist
mkdir dist
mv ssp-*.tgz dist/pack.tgz

cd dist
tar -xzf pack.tgz --strip 1
rm -rf pack.tgz
npm install --production
cd ..

# First run that print a banner
node dist/bin/ssp --version

# cleanup
find -name "*~" -delete

# fix chmod
chmod 755 `find -name LICENSE`
chmod a+x `find -name "*.sh"`

tar -cvzf dist/ssp-v`node dist/bin/ssp --version`.tar.gz dist/*
shasum -a 256 dist/ssp-*.tar.gz
