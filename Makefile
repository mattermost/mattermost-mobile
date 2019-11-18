.PHONY: pre-run pre-build clean
.PHONY: check-style
.PHONY: i18n-extract-ci
.PHONY: start stop
.PHONY: run run-ios run-android
.PHONY: build build-ios build-android unsigned-ios unsigned-android ios-sim-x86_64
.PHONY: build-pr can-build-pr prepare-pr
.PHONY: test help

POD := $(shell which pod 2> /dev/null)
OS := $(shell sh -c 'uname -s 2>/dev/null')
BASE_ASSETS = $(shell find assets/base -type d) $(shell find assets/base -type f -name '*')
OVERRIDE_ASSETS = $(shell find assets/override -type d 2> /dev/null) $(shell find assets/override -type f -name '*' 2> /dev/null)
MM_UTILITIES_DIR = ../mattermost-utilities

node_modules: package.json
	@if ! [ $(shell which npm 2> /dev/null) ]; then \
		echo "npm is not installed https://npmjs.com"; \
		exit 1; \
	fi

	@echo Getting Javascript dependencies
	@npm install

npm-ci: package.json
	@if ! [ $(shell which npm 2> /dev/null) ]; then \
		echo "npm is not installed https://npmjs.com"; \
		exit 1; \
	fi

	@echo Getting Javascript dependencies
	@npm ci

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

pre-run: | node_modules .podinstall dist/assets ## Installs dependencies and assets

pre-build: | npm-ci .podinstall dist/assets ## Install dependencies and assets before building

check-style: node_modules ## Runs eslint
	@echo Checking for style guide compliance
	@npm run check

clean: ## Cleans dependencies, previous builds and temp files
	@echo Cleaning started

	@rm -f .podinstall
	@rm -rf ios/Pods
	@rm -rf node_modules
	@rm -rf dist
	@rm -rf ios/build
	@rm -rf android/app/build

	@echo Cleanup finished

post-install:
	@./node_modules/.bin/patch-package
	@./node_modules/.bin/jetify

	@rm -f node_modules/intl/.babelrc
	@# Hack to get react-intl and its dependencies to work with react-native
	@# Based off of https://github.com/este/este/blob/master/gulp/native-fix.js
	@sed -i'' -e 's|"./locale-data/index.js": false|"./locale-data/index.js": "./locale-data/index.js"|g' node_modules/react-intl/package.json
	@sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-messageformat/package.json
	@sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-relativeformat/package.json
	@sed -i'' -e 's|"./locale-data/complete.js": false|"./locale-data/complete.js": "./locale-data/complete.js"|g' node_modules/intl/package.json

start: | pre-run ## Starts the React Native packager server
	$(call start_packager)

stop: ## Stops the React Native packager server
	$(call stop_packager)

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
	@if [ $(shell ps -ef | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		npm start & echo Running iOS app in development; \
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
	@if [ $(shell ps -ef | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
        echo Starting React Native packager server; \
    	npm start & echo Running Android app in development; \
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

build: | stop pre-build check-style i18n-extract-ci ## Builds the app for Android & iOS
	$(call start_packager)
	@echo "Building App"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane build
	$(call stop_packager)


build-ios: | stop pre-build check-style i18n-extract-ci ## Builds the iOS app
	$(call start_packager)
	@echo "Building iOS app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane ios build
	$(call stop_packager)

build-android: | stop pre-build check-style i18n-extract-ci prepare-android-build ## Build the Android app
	$(call start_packager)
	@echo "Building Android app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane android build
	$(call stop_packager)

unsigned-ios: stop pre-build check-style ## Build an unsigned version of the iOS app
	$(call start_packager)
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios unsigned
	$(call stop_packager)

ios-sim-x86_64: stop pre-build check-style ## Build an unsigned x86_64 version of the iOS app for iPhone simulator
	$(call start_packager)
	@echo "Building unsigned x86_64 iOS app for iPhone simulator"
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios unsigned
	@mkdir -p build-ios
	@cd ios/ && xcodebuild -workspace Mattermost.xcworkspace/ -scheme Mattermost -arch x86_64 -sdk iphonesimulator -configuration Release -parallelizeTargets -resultBundlePath ../build-ios/result -derivedDataPath ../build-ios/ ENABLE_BITCODE=NO CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ENABLE_BITCODE=NO
	@cd build-ios/Build/Products/Release-iphonesimulator/ && zip -r Mattermost-simulator-x86_64.app.zip Mattermost.app/
	@mv build-ios/Build/Products/Release-iphonesimulator/Mattermost-simulator-x86_64.app.zip .
	@rm -rf build-ios/
	@cd fastlane && bundle exec fastlane upload_file_to_s3 file:Mattermost-simulator-x86_64.app.zip os_type:iOS
	$(call stop_packager)

unsigned-android: stop pre-build check-style prepare-android-build ## Build an unsigned version of the Android app
	@cd fastlane && NODE_ENV=production bundle exec fastlane android unsigned

test: | pre-run check-style ## Runs tests
	@npm test

build-pr: | can-build-pr stop pre-build check-style i18n-extract-ci ## Build a PR from the mattermost-mobile repo
	$(call start_packager)
	@echo "Building App from PR ${PR_ID}"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane build_pr pr:PR-${PR_ID}
	$(call stop_packager)

can-build-pr:
	@if [ -z ${PR_ID} ]; then \
		echo a PR number needs to be specified; \
		exit 1; \
	fi

i18n-extract: ## Extract strings for translation from the source code
	npm run mmjstool -- i18n extract-mobile

i18n-extract-ci:
	mkdir -p tmp
	cp assets/base/i18n/en.json tmp/en.json
	mkdir -p tmp/fake-webapp-dir/i18n/
	echo '{}' > tmp/fake-webapp-dir/i18n/en.json
	npm run mmjstool -- i18n extract-mobile --webapp-dir tmp/fake-webapp-dir --mobile-dir .
	diff tmp/en.json assets/base/i18n/en.json
	rm -rf tmp

## Help documentation https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

define start_packager
	@if [ $(shell ps -ef | grep -i "cli.js start" | grep -civ grep) -eq 0 ]; then \
		echo Starting React Native packager server; \
		npm start & echo; \
	else \
		echo React Native packager server already running; \
	fi
endef

define stop_packager
	@echo Stopping React Native packager server
	@if [ $(shell ps -ef | grep -i "cli.js start" | grep -civ grep) -eq 1 ]; then \
		ps -ef | grep -i "cli.js start" | grep -iv grep | awk '{print $$2}' | xargs kill -9; \
		echo React Native packager server stopped; \
	else \
		echo No React Native packager server running; \
	fi
endef
