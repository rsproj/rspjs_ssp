#!/bin/bash

set -ex

# Ensure all the tools we need are available
ensureAvailable() {
  eval $1 --version >/dev/null || (echo "You need to install $1" && exit 2)
}
ensureAvailable dpkg-deb
ensureAvailable fpm
ensureAvailable fakeroot
ensureAvailable lintian
ensureAvailable rpmbuild

PACKAGE_TMPDIR=tmp/debian_pkg
echo "Cleaning PACKAGE_TMPDIR..."
rm -rf $PACKAGE_TMPDIR

PM2_VERSION=`node dist/bin/ssp --version`
VERSION=$PM2_VERSION
TARBALL_NAME=dist/ssp-v$PM2_VERSION.tar.gz
OUTPUT_DIR=artifacts

if [ ! -e $TARBALL_NAME ]; then
  echo "Hey! Listen! You need to run build-dist.sh first."
  exit 1
fi;

mkdir -p $OUTPUT_DIR
# Remove old packages
rm -f dist/*.deb $OUTPUT_DIR/*.deb $OUTPUT_DIR/*.rpm

# Extract to a temporary directory
rm -rf $PACKAGE_TMPDIR
mkdir -p $PACKAGE_TMPDIR/
tar zxf $TARBALL_NAME -C $PACKAGE_TMPDIR/

# Create Linux package structure
mkdir -p $PACKAGE_TMPDIR/usr/share/ssp/
mkdir -p $PACKAGE_TMPDIR/usr/share/doc/ssp/
mv $PACKAGE_TMPDIR/dist/bin $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/lib $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/constants.js $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/paths.js $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/index.js $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/node_modules $PACKAGE_TMPDIR/usr/share/ssp/
mv $PACKAGE_TMPDIR/dist/package.json $PACKAGE_TMPDIR/usr/share/ssp/
cp packager/debian/copyright $PACKAGE_TMPDIR/usr/share/doc/ssp/copyright

INSTALLED_SIZE=`du -sk $PACKAGE_TMPDIR | cut -f 1`
sed -i "s/__VERSION__/$VERSION/" packager/debian/control
sed -i "s/__INSTALLED_SIZE__/$INSTALLED_SIZE/" packager/debian/control

mkdir -p $PACKAGE_TMPDIR/etc/default
echo "[+] Adding default configuration file for ssp to package."
cat <<EOF > $PACKAGE_TMPDIR/etc/default/ssp
##
## Default configuration var for ssp
##

# Path for PM2's home (configuration files, modules, sockets... etc)
export PM2_HOME=/etc/ssp

# User that own files in PM2_HOME
export PM2_SOCKET_USER=\`id -u ssp\`

# Group that own files in PM2_HOME
export PM2_SOCKET_GROUP=\`id -g ssp\`

EOF

mkdir -p $PACKAGE_TMPDIR/etc/systemd/system/
echo "[+] Adding systemd configuration for ssp to package."
cat <<EOF > $PACKAGE_TMPDIR/etc/systemd/system/ssp.service
[Unit]
Description=PM2 process manager
Documentation=https://ssp.keymetrics.io/
After=network.target

[Service]
Type=forking
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
PIDFile=/etc/ssp/ssp.pid
Restart=on-failure

ExecStart=/usr/bin/ssp resurrect
ExecReload=/usr/bin/ssp reload all
ExecStop=/usr/bin/ssp kill

[Install]
WantedBy=multi-user.target
EOF

# These are unneeded and throw lintian lint errors
rm -f $PACKAGE_TMPDIR/usr/share/ssp/node_modules/node-uuid/benchmark/bench.gnu
find $PACKAGE_TMPDIR/usr/share/ssp \( -name '*.md' -o  -name '*.md~' -o -name '*.gitmodules' \) -delete

# Assume everything else is junk we don't need
rm -rf $PACKAGE_TMPDIR/dist

# Currently the "binaries" are JavaScript files that expect to be in the same
# directory as the libraries, so we can't just copy them directly to /usr/bin.
# We set the path and pass the args in another script instead.

mkdir -p $PACKAGE_TMPDIR/usr/bin/

cat <<EOF > $PACKAGE_TMPDIR/usr/bin/ssp
#!/bin/bash
. /etc/default/ssp
/usr/share/ssp/bin/ssp \$@
EOF
chmod a+x $PACKAGE_TMPDIR/usr/bin/ssp

#### Build RPM
fpm --input-type dir --chdir $PACKAGE_TMPDIR \
    --name ssp \
    --url https://ssp.io/ \
    --category 'Development/Languages' \
    --license AGPLv3 \
    --description '$(cat packager/debian/description)' \
    --vendor 'Keymetrics <tech@keymetrics.io>' \
    --maintainer 'Alexandre Strzelewicz <tech@keymetrics.io>' \
    --version $PM2_VERSION \
    --after-install packager/rhel/postinst \
    --before-remove packager/rhel/prerm \
    --after-remove packager/rhel/postrm \
    --architecture noarch \
    --depends nodejs \
    --output-type rpm .

##### Adapt files for Debian-like distro
mkdir -p $PACKAGE_TMPDIR/DEBIAN
mkdir -p $PACKAGE_TMPDIR/usr/share/lintian/overrides/
cp packager/debian/lintian-overrides $PACKAGE_TMPDIR/usr/share/lintian/overrides/ssp

# Debian/Ubuntu call the Node.js binary "nodejs", not "node".
sed -i 's/env node/env nodejs/' $PACKAGE_TMPDIR/usr/share/ssp/bin/ssp

# Replace variables in Debian package control file
cp packager/debian/* $PACKAGE_TMPDIR/DEBIAN/.

ls $PACKAGE_TMPDIR/DEBIAN/

##### Build DEB (Debian, Ubuntu) package
fakeroot dpkg-deb -b $PACKAGE_TMPDIR "ssp_"$VERSION"_all.deb"
