.PHONY: run run-ios run-android check-style test clean

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
	@echo Running iOS app in development

	npm run run-ios

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
