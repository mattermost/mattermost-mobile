.PHONY: run run-ios run-android check-style test clean post-install start stop
.PHONY: check-ios-target build-ios
.PHONY: check-android-target prepare-android-build build-android
.PHONY: start-packager stop-packager

ios_target := $(filter-out build-ios,$(MAKECMDGOALS))
android_target := $(filter-out build-android,$(MAKECMDGOALS))

.npminstall: package.json
	@if ! [ $(shell command -v npm) ]; then \
		echo "npm is not installed"; \
		exit 1; \
	fi

	@echo Getting dependencies using npm

	npm install

	touch $@

BASE_ASSETS = $(shell find assets/base -type d) $(shell find assets/base -type f -name '*')
OVERRIDE_ASSETS = $(shell find assets/override -type d 2> /dev/null) $(shell find assets/override -type f -name '*' 2> /dev/null)
dist/assets: $(BASE_ASSETS) $(OVERRIDE_ASSETS)

	mkdir -p dist

	@if [ -e dist/assets ] ; then \
		rm -rf dist/assets; \
	fi

	node scripts/make-dist-assets.js

pre-run: .npminstall dist/assets

run: run-ios

start: | pre-run start-packager

stop: stop-packager

run-ios: | start
	@if ! [ $(shell command -v xcodebuild) ]; then \
		echo "xcode is not installed"; \
		exit 1; \
	fi
	@if ! [ $(shell command -v watchman) ]; then \
		echo "watchman is not installed"; \
		exit 1; \
	fi

	@echo Running iOS app in development

	npm run run-ios
	open -a Simulator

run-android: | start prepare-android-build
	@if ! [ $(ANDROID_HOME) ]; then \
		echo "ANDROID_HOME is not set"; \
		exit 1; \
	fi
	@if ! [ $(shell command -v adb) ]; then \
		echo "adb is not installed"; \
		exit 1; \
	fi
	@if ! [ $(shell adb get-state) == "device" ]; then \
		echo "no android device or emulator is running"; \
		exit 1; \
	fi
	@if ! [ $(shell command -v watchman) ]; then \
		echo "watchman is not installed"; \
		exit 1; \
	fi

	@echo Running Android app in development

	npm run run-android

test: pre-run
	npm test

check-style: .npminstall
	@echo Checking for style guide compliance

	npm run check

clean:
	@echo Cleaning app

	npm cache clean
	rm -rf node_modules
	rm -f .npminstall
	rm -rf dist

post-install:
	./node_modules/.bin/remotedev-debugger --hostname localhost --port 5678 --injectserver

	@# Hack to get react-intl and its dependencies to work with react-native
	@# Based off of https://github.com/este/este/blob/master/gulp/native-fix.js
	sed -i'' -e 's|"./locale-data/index.js": false|"./locale-data/index.js": "./locale-data/index.js"|g' node_modules/react-intl/package.json
	sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-messageformat/package.json
	sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-relativeformat/package.json
	sed -i'' -e 's|"./locale-data/complete.js": false|"./locale-data/complete.js": "./locale-data/complete.js"|g' node_modules/intl/package.json

start-packager:
	@if [ $(shell ps -a | grep "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		node ./node_modules/react-native/local-cli/cli.js start --reset-cache & echo $$! > server.PID; \
	else \
		echo React Native packager server already running; \
		ps -a | grep -i "cli.js start" | grep -v grep | awk '{print $$1}' > server.PID; \
	fi

stop-packager:
	@echo Stopping React Native packager server
	@kill -9 `cat server.PID` && rm server.PID

check-ios-target:
ifneq ($(ios_target), $(filter $(ios_target), dev beta release))
	@echo "Try running make build-ios TARGET\nWhere TARGET is one of dev, beta or release"
	@exit 1
endif

do-build-ios:
	@echo "Building ios $(ios_target) app"
	@cd fastlane && bundle exec fastlane ios $(ios_target)


build-ios: | check-ios-target pre-run check-style start-packager do-build-ios stop-packager

check-android-target:
ifneq ($(android_target), $(filter $(android_target), dev beta release))
	@echo "Try running make build-android TARGET\nWhere TARGET is one of dev, beta or release"
	@exit 1
endif

prepare-android-build:
	@rm -rf ./node_modules/react-native/local-cli/templates/HelloWorld
	@cd android && ./gradlew clean

do-build-android:
	@echo "Building android $(android_target) app"
	@cd fastlane && bundle exec fastlane android $(android_target)

build-android: | check-android-target pre-run check-style start-packager prepare-android-build do-build-android stop-packager

dev:
	@:

beta:
	@:

release:
	@:
