#!/bin/bash

##### Cloud testrun dependencies start
echo "[Testdroid-ssa-client] Extracting tests.zip..."
unzip tests.zip

echo "[Testdroid-ssa-client] NOT Starting Appium, start it in your test script if needed!"

##### Cloud testrun dependencies end.

export APPIUM_APPFILE=$PWD/application.apk #dummy app, not the actual app

## Run the test:
echo "[Testdroid-ssa-client] Running test ${TEST}"

export APPFILE=$PWD/android/app/build/outputs/apk/release/app-release.apk

# put local tools to path
export PATH=$PATH:$PWD

#################################

echo "using APPFILE: ${APPFILE}"
cd "$(dirname "$0")" || exit

echo "Before install $(date)"
APILEVEL=$(adb shell getprop ro.build.version.sdk)
APILEVEL="${APILEVEL//[$'\t\r\n']}"
export APILEVEL
echo "API level is: ${APILEVEL}"

# Run adb once so API level can be read without the "daemon not running"-message
adb devices
adb shell pm list packages -f | grep detox

UDID="$(adb devices | grep device | tr "\n" " " | awk '{print $5}')"
export UDID
echo "UDID: $UDID"

# Begin enable if bitbar
BITBAR=false
if $BITBAR ; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> $HOME/.bash_profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install watchman
fi
# End enable if bitbar

node --version
npm -version
watchman --version

echo "Npm install detox"
cd detox
npm install

echo "Launching Detox server"
pgrep -f run-server | xargs kill -9
npm run e2e:run-detox-server > detox-server.log 2>&1 &

# allow device to contact host by localhost
adb reverse tcp:8099 tcp:8099

echo "Running tests $(date)"
sed -i.bu "s/ADD_DEVICE_ID_HERE/$UDID/" .detoxrc.json
cat .detoxrc.json

export SITE_URL="https://bitbar.test.mattermost.cloud"
npm run e2e:android-test-release-attached -- e2e/test/smoke_test/login_email.e2e.js --loglevel verbose > detox.log 2>&1
scriptExitStatus=$?

echo "detox-test-log"
ls -la detox.log
cat detox.log

echo "detox-server-log"
ls -la detox-server.log
cat detox-server.log

adb uninstall com.mattermost.rnbeta
adb uninstall com.mattermost.rnbeta.test

adb shell pm list packages -f | grep mattermost
adb shell pm list instrumentation | grep mattermost

echo "Test has been run $(date), exit status: '${scriptExitStatus}'"

mv artifacts/*.xml TEST-all.xml

exit $scriptExitStatus
