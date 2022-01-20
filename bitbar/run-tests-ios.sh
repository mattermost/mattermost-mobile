#!/bin/bash

##### Cloud testrun dependencies start
echo "[Testdroid-ssa-client] Extracting tests.zip..."
unzip tests.zip

echo "[Testdroid-ssa-client] NOT Starting Appium, start it in your test script if needed!"

##### Cloud testrun dependencies end.

export APPIUM_APPFILE=$PWD/application.ipa #dummy app, not the actual app

## Run the test:
echo "[Testdroid-ssa-client] Running test ${TEST}"

export APPFILE=$PWD/ios/build/Build/Products/Release-iphonesimulator/Mattermost.app

# put local tools to path
export PATH=$PATH:$PWD

#################################

echo "using APPFILE: ${APPFILE}"
cd "$(dirname "$0")" || exit

echo "Before install $(date)"
if [ -z ${UDID} ] ; then
	export UDID=${IOS_UDID}
fi
echo "UDID is ${UDID}"

# Begin enable if bitbar
BITBAR=false
if $BITBAR ; then
	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
	echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> $HOME/.bash_profile
	eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
	brew tap wix/brew
	brew install applesimutils
	brew install watchman
fi
# End of enable if bitbar

applesimutils --list
node --version
npm -version
watchman --version

echo "Npm install detox"
cd detox
npm install

echo "Launching Detox server"
pgrep -f run-server | xargs kill -9
npm run e2e:run-detox-server > detox-server.log 2>&1 &

echo "Running tests $(date)"
cat package.json

export SITE_URL="https://bitbar.test.mattermost.cloud"
npm run e2e:ios-test-release -- e2e/test/smoke_test/login_email.e2e.js --loglevel verbose > detox.log 2>&1
scriptExitStatus=$?

echo "detox-test-log"
ls -la detox.log
cat detox.log

echo "detox-server-log"
ls -la detox-server.log
cat detox-server.log

echo "Test has been run $(date), exit status: '${scriptExitStatus}'"

mv artifacts/*.xml TEST-all.xml

exit $scriptExitStatus
