.PHONY: run run-ios run-android check-style test clean post-install

.npminstall: package.json
	@if ! [ $(shell command -v npm) ]; then \
		echo "npm is not installed"; \
		exit 1; \
	fi

	@echo Getting dependencies using npm

	npm install

	touch $@

config/config.secret.json:
	@if ! [ $(shell test -f config/config.secret.json) ]; then \
		echo "Generating default config/config.secret.json"; \
		echo '{}' > "config/config.secret.json"; \
	fi

run: run-ios

run-ios: .npminstall config/config.secret.json
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


run-android: .npminstall config/config.secret.json
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

test: .npminstall config/config.secret.json
	npm test

check-style: .npminstall
	@echo Checking for style guide compliance

	npm run check

clean:
	@echo Cleaning app

	npm cache clean
	rm -rf node_modules
	rm -f .npminstall

post-install:
	@# Hack to get react-intl and its dependencies to work with react-native
	@# Based off of https://github.com/este/este/blob/master/gulp/native-fix.js
	sed -i'' -e 's|"./locale-data/index.js": false|"./locale-data/index.js": "./locale-data/index.js"|g' node_modules/react-intl/package.json
	sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-messageformat/package.json
	sed -i'' -e 's|"./lib/locales": false|"./lib/locales": "./lib/locales"|g' node_modules/intl-relativeformat/package.json
	sed -i'' -e 's|"./locale-data/complete.js": false|"./locale-data/complete.js": "./locale-data/complete.js"|g' node_modules/intl/package.json
