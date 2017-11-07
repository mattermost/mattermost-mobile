.PHONY: run run-ios run-android check-style test clean post-install start stop
.PHONY: check-ios-target build-ios
.PHONY: check-android-target prepare-android-build build-android
.PHONY: start-packager stop-packager

ios_target := $(filter-out build-ios,$(MAKECMDGOALS))
android_target := $(filter-out build-android,$(MAKECMDGOALS))
POD := $(shell command -v pod 2> /dev/null)

.yarninstall: package.json
	@if ! [ $(shell command -v yarn 2> /dev/null) ]; then \
		@echo "yarn is not installed https://yarnpkg.com"; \
		exit 1; \
	fi

	@echo Getting Javascript dependencies
	@yarn install --pure-lockfile

	@touch $@

.podinstall:
ifdef POD
	@echo Getting Cocoapods dependencies;
	@cd ios && pod install;
else
	@echo "Cocoapods is not installed https://cocoapods.org/"
	@exit 1
endif

	@touch $@

BASE_ASSETS = $(shell find assets/base -type d) $(shell find assets/base -type f -name '*')
OVERRIDE_ASSETS = $(shell find assets/override -type d 2> /dev/null) $(shell find assets/override -type f -name '*' 2> /dev/null)
dist/assets: $(BASE_ASSETS) $(OVERRIDE_ASSETS)

	@mkdir -p dist

	@if [ -e dist/assets ] ; then \
		rm -rf dist/assets; \
	fi

	@echo "Generating app assets"
	@node scripts/make-dist-assets.js

pre-run: | .yarninstall .podinstall dist/assets

run: run-ios

start: | pre-run start-packager

stop: stop-packager

check-device-ios:
	@if ! [ $(shell command -v xcodebuild) ]; then \
		@echo "xcode is not installed"; \
		@exit 1; \
	fi
	@if ! [ $(shell command -v watchman) ]; then \
		@echo "watchman is not installed"; \
		@exit 1; \
	fi

run-ios: | check-device-ios start
	@echo Running iOS app in development
	@react-native run-ios --simulator="${SIMULATOR}"

check-device-android:
	@if ! [ $(ANDROID_HOME) ]; then \
		@echo "ANDROID_HOME is not set"; \
		@exit 1; \
	fi
	@if ! [ $(shell command -v adb 2> /dev/null) ]; then \
		@echo "adb is not installed"; \
		@exit 1; \
	fi
ifneq ($(shell adb get-state),device)
	@echo "no android device or emulator is running"
	@exit 1;
endif
	@if ! [ $(shell command -v watchman 2> /dev/null) ]; then \
		@echo "watchman is not installed"; \
		@exit 1; \
	fi

run-android: | check-device-android start prepare-android-build
	@echo Running Android app in development
	@react-native run-android --no-packager

test: | pre-run check-style
	@yarn test

check-style: .yarninstall
	@echo Checking for style guide compliance
	@node_modules/.bin/eslint --ext \".js\" --ignore-pattern node_modules --quiet .

clean:
	@echo Cleaning started

	@yarn cache clean
	@rm -rf node_modules
	@rm -f .yarninstall
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
	@sed -i'' -e "s|var AndroidTextInput = requireNativeComponent('AndroidTextInput', null);|var AndroidTextInput = requireNativeComponent('CustomTextInput', null);|g" node_modules/react-native/Libraries/Components/TextInput/TextInput.js
	@cd ./node_modules/react-native-svg/ios && rm -rf PerformanceBezier && git clone https://github.com/adamwulf/PerformanceBezier.git
	@cd ./node_modules/mattermost-redux && yarn run build

start-packager:
	@if [ $(shell ps -e | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start --reset-cache & echo $$! > server.PID; \
	else \
		echo React Native packager server already running; \
		ps -e | grep -i "cli.js start" | grep -v grep | awk '{print $$1}' > server.PID; \
	fi

stop-packager:
	@echo Stopping React Native packager server
	@if [ -e "server.PID" ] ; then \
		kill -9 `cat server.PID` && rm server.PID; \
		echo React Native packager server stopped; \
	else \
		echo No React Native packager server running; \
	fi

check-ios-target:
ifeq ($(ios_target), )
	@echo No target set to build iOS app
	@echo "Try running make build-ios TARGET where TARGET is one of dev, beta or release"
	@exit 1
endif
ifneq ($(ios_target), $(filter $(ios_target),dev beta release))
	@echo Invalid target set to build iOS app
	@echo "Try running make build-ios TARGET where TARGET is one of dev, beta or release"
	@exit 1
endif

do-build-ios:
	@echo "Building ios $(ios_target) app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane ios $(ios_target)


build-ios: | check-ios-target pre-run check-style start-packager do-build-ios stop-packager

check-android-target:
ifeq ($(android_target), )
	@echo No target set to build Android app
	@echo "Try running make build-android TARGET where TARGET is one of dev, beta or release"
	@exit 1
endif
ifneq ($(android_target), $(filter $(android_target),dev alpha release))
	@echo Invalid target set to build Android app
	@echo "Try running make build-android TARGET where TARGET is one of dev, beta or release"
	@exit 1
endif

prepare-android-build:
	@rm -rf ./node_modules/react-native/local-cli/templates/HelloWorld
	@rm -rf ./node_modules/react-native-linear-gradient/Examples/
	@rm -rf ./node_modules/react-native-orientation/demo/

do-build-android:
	@echo "Building android $(android_target) app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane android $(android_target)

build-android: | check-android-target pre-run check-style start-packager prepare-android-build do-build-android stop-packager

do-unsigned-ios:
	@echo "Building unsigned iOS app"
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios unsigned
	@mkdir -p build-ios
	@cd ios/ && xcodebuild -workspace Mattermost.xcworkspace/ -scheme Mattermost -sdk iphoneos -configuration Relase -parallelizeTargets -resultBundlePath ../build-ios/result -derivedDataPath ../build-ios/ CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
	@cd build-ios/ && mkdir -p Payload && cp -R Build/Products/Release-iphoneos/Mattermost.app Payload/ && zip -r Mattermost-unsigned.ipa Payload/
	@mv build-ios/Mattermost-unsigned.ipa .
	@rm -rf build-ios/

do-unsigned-android:
	@echo "Building unsigned Android app"
	@cd fastlane && NODE_ENV=production bundle exec fastlane android unsigned
	@mv android/app/build/outputs/apk/app-unsigned-unsigned.apk ./Mattermost-unsigned.apk

unsigned-android: pre-run check-style start-packager do-unsigned-android stop-packager

unsigned-ios: pre-run check-style start-packager do-unsigned-ios stop-packager

alpha:
	@:

dev:
	@:

beta:
	@:

release:
	@:
