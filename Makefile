.PHONY: pre-run clean
.PHONY: check-style
.PHONY: start stop
.PHONY: run run-ios run-android
.PHONY: build-ios build-android unsigned-ios unsigned-android
.PHONY: test help

POD := $(shell which pod 2> /dev/null)
OS := $(shell sh -c 'uname -s 2>/dev/null')
BASE_ASSETS = $(shell find assets/base -type d) $(shell find assets/base -type f -name '*')
OVERRIDE_ASSETS = $(shell find assets/override -type d 2> /dev/null) $(shell find assets/override -type f -name '*' 2> /dev/null)

.npminstall: package.json
	@if ! [ $(shell which npm 2> /dev/null) ]; then \
		echo "npm is not installed https://npmjs.com"; \
		exit 1; \
	fi

	@echo Getting Javascript dependencies
	@npm install

	@touch $@

.podinstall:
ifeq ($(OS), Darwin)
ifdef POD
	@echo Getting Cocoapods dependencies;
	@cd ios && pod install;
else
	@echo "Cocoapods is not installed https://cocoapods.org/"
	@exit 1
endif
endif
	@touch $@

dist/assets: $(BASE_ASSETS) $(OVERRIDE_ASSETS)
	@mkdir -p dist

	@if [ -e dist/assets ] ; then \
		rm -rf dist/assets; \
	fi

	@echo "Generating app assets"
	@node scripts/make-dist-assets.js

pre-run: | .npminstall .podinstall dist/assets ## Installs dependencies and assets

check-style: .npminstall ## Runs eslint
	@echo Checking for style guide compliance
	@npm run check

clean: ## Cleans dependencies, previous builds and temp files
	@echo Cleaning started

	@rm -rf node_modules
	@rm -f .npminstall
	@rm -f .podinstall
	@rm -rf dist
	@rm -rf ios/build
	@rm -rf ios/Pods
	@rm -rf android/app/build

	@echo Cleanup finished

post-install:
	@./node_modules/.bin/remotedev-debugger --hostname localhost --port 5678 --injectserver
	@# Must remove the .babelrc for 0.42.0 to work correctly
	@# Need to copy custom ImagePickerModule.java that implements correct permission checks for android
	@rm node_modules/react-native-image-picker/android/src/main/java/com/imagepicker/ImagePickerModule.java
	@cp ./ImagePickerModule.java node_modules/react-native-image-picker/android/src/main/java/com/imagepicker
	@rm -f node_modules/intl/.babelrc
	@# Hack to get react-intl and its dependencies to work with react-native
	@# Based off of https://github.com/este/este/blob/master/gulp/native-fix.js
	@sed -i'' -e 's|"./locale-data/index.js": false|"./locale-data/index.js": "./locale-data/index.js"|g' node_modules/react-intl/package.json
	@sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-messageformat/package.json
	@sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-relativeformat/package.json
	@sed -i'' -e 's|"./locale-data/complete.js": false|"./locale-data/complete.js": "./locale-data/complete.js"|g' node_modules/intl/package.json
	@sed -i'' -e 's|auto("auto", Configuration.ORIENTATION_UNDEFINED, ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);|auto("auto", Configuration.ORIENTATION_UNDEFINED, ActivityInfo.SCREEN_ORIENTATION_FULL_USER);|g' node_modules/react-native-navigation/android/app/src/main/java/com/reactnativenavigation/params/Orientation.java
	@sed -i'' -e "s|super.onBackPressed();|this.moveTaskToBack(true);|g" node_modules/react-native-navigation/android/app/src/main/java/com/reactnativenavigation/controllers/NavigationActivity.java
	@if [ $(shell grep "const Platform" node_modules/react-native/Libraries/Lists/VirtualizedList.js | grep -civ grep) -eq 0 ]; then \
		sed $ -i'' -e "s|const ReactNative = require('ReactNative');|const ReactNative = require('ReactNative');`echo $\\\\\\r;`const Platform = require('Platform');|g" node_modules/react-native/Libraries/Lists/VirtualizedList.js; \
	fi
	@sed -i'' -e 's|transform: \[{scaleY: -1}\],|...Platform.select({android: {transform: \[{perspective: 1}, {scaleY: -1}\]}, ios: {transform: \[{scaleY: -1}\]}}),|g' node_modules/react-native/Libraries/Lists/VirtualizedList.js
	@cd ./node_modules/mattermost-redux && npm run build

start: | pre-run ## Starts the React Native packager server
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start; \
	else \
		echo React Native packager server already running; \
	fi

stop: ## Stops the React Native packager server
	@echo Stopping React Native packager server
	@if [ $(shell ps -ef | grep -i "cli.js start" | grep -civ grep) -eq 1 ]; then \
		ps -ef | grep -i "cli.js start" | grep -iv grep | awk '{print $$2}' | xargs kill -9; \
		echo React Native packager server stopped; \
	else \
		echo No React Native packager server running; \
	fi

check-device-ios:
	@if ! [ $(shell which xcodebuild) ]; then \
		echo "xcode is not installed"; \
		exit 1; \
	fi
	@if ! [ $(shell which watchman) ]; then \
		echo "watchman is not installed"; \
		exit 1; \
	fi

check-device-android:
	@if ! [ $(ANDROID_HOME) ]; then \
		echo "ANDROID_HOME is not set"; \
		exit 1; \
	fi
	@if ! [ $(shell which adb 2> /dev/null) ]; then \
		echo "adb is not installed"; \
		exit 1; \
	fi

	@echo "Connect your Android device or open the emulator"
	@adb wait-for-device

	@if ! [ $(shell which watchman 2> /dev/null) ]; then \
		echo "watchman is not installed"; \
		exit 1; \
	fi

prepare-android-build:
	@rm -rf ./node_modules/react-native/local-cli/templates/HelloWorld
	@rm -rf ./node_modules/react-native-linear-gradient/Examples/
	@rm -rf ./node_modules/react-native-orientation/demo/

run: run-ios ## alias for run-ios

run-ios: | check-device-ios pre-run ## Runs the app on an iOS simulator
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start & echo Running iOS app in development; \
		if [ ! -z "${SIMULATOR}" ]; then \
			react-native run-ios --simulator="${SIMULATOR}"; \
		else \
			react-native run-ios; \
		fi; \
		wait; \
	else \
		echo Running iOS app in development; \
		if [ ! -z "${SIMULATOR}" ]; then \
			react-native run-ios --simulator="${SIMULATOR}"; \
		else \
			react-native run-ios; \
		fi; \
	fi

run-android: | check-device-android pre-run prepare-android-build ## Runs the app on an Android emulator or dev device
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
        echo Starting React Native packager server; \
    	node ./node_modules/react-native/local-cli/cli.js start & echo Running Android app in development; \
    	if [ ! -z ${VARIANT} ]; then \
    		react-native run-android --no-packager --variant=${VARIANT}; \
    	else \
    		react-native run-android --no-packager; \
    	fi; \
    	wait; \
    else \
    	echo Running Android app in development; \
        if [ ! -z ${VARIANT} ]; then \
			react-native run-android --no-packager --variant=${VARIANT}; \
		else \
			react-native run-android --no-packager; \
		fi; \
    fi

build-ios: | pre-run check-style ## Creates an iOS build
ifneq ($(IOS_APP_GROUP),)
	@mkdir -p assets/override
	@echo "{\n\t\"AppGroupId\": \"$$IOS_APP_GROUP\"\n}" > assets/override/config.json
endif
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start & echo; \
	fi
	@echo "Building iOS app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane ios build
	@ps -e | grep -i "cli.js start" | grep -iv grep | awk '{print $$1}' | xargs kill -9
	@rm -rf assets/override

build-android: | pre-run check-style prepare-android-build ## Creates an Android build
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start & echo; \
	fi
	@echo "Building Android app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane android build
	@ps -e | grep -i "cli.js start" | grep -iv grep | awk '{print $$1}' | xargs kill -9

unsigned-ios: pre-run check-style
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start & echo; \
	fi
	@echo "Building unsigned iOS app"
ifneq ($(IOS_APP_GROUP),)
	@mkdir -p assets/override
	@echo "{\n\t\"AppGroupId\": \"$$IOS_APP_GROUP\"\n}" > assets/override/config.json
endif
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios unsigned
	@mkdir -p build-ios
	@cd ios/ && xcodebuild -workspace Mattermost.xcworkspace/ -scheme Mattermost -sdk iphoneos -configuration Relase -parallelizeTargets -resultBundlePath ../build-ios/result -derivedDataPath ../build-ios/ CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
	@cd build-ios/ && mkdir -p Payload && cp -R Build/Products/Release-iphoneos/Mattermost.app Payload/ && zip -r Mattermost-unsigned.ipa Payload/
	@mv build-ios/Mattermost-unsigned.ipa .
	@rm -rf build-ios/
	@rm -rf assets/override
	@ps -e | grep -i "cli.js start" | grep -iv grep | awk '{print $$1}' | xargs kill -9

unsigned-android: pre-run check-style prepare-android-build
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start & echo; \
    fi
	@echo "Building unsigned Android app"
	@cd fastlane && NODE_ENV=production bundle exec fastlane android unsigned
	@mv android/app/build/outputs/apk/app-unsigned-unsigned.apk ./Mattermost-unsigned.apk
	@ps -e | grep -i "cli.js start" | grep -iv grep | awk '{print $$1}' | xargs kill -9

test: | pre-run check-style ## Runs tests
	@npm test

## Help documentation https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
