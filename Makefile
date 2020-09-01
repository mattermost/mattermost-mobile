.PHONY: build-ipa build-apk setup
.PHONY: unsigned-ipa unsigned-apk ios-sim-x86_64
.PHONY: help

setup:
ifneq (${SKIP_SETUP}, true)
	@npm run clean
	@npm install
	@echo "Installing Fastane"
	@cd fastlane && bundle install
endif

build-ipa: | setup ## Build the iOS app
	@echo "Building iOS app"
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane ios build

build-apk: | setup ## Build the Android app
	@echo "Building Android app"
	@./node_modules/.bin/jetify
	@cd fastlane && BABEL_ENV=production NODE_ENV=production bundle exec fastlane android build

unsigned-ipa: | setup ## Build an unsigned version of the iOS app
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios unsigned

ios-sim-x86_64: | setup ## Build an unsigned x86_64 version of the iOS app for iPhone simulator
	@echo "Building unsigned x86_64 iOS app for iPhone simulator"
	@cd fastlane && NODE_ENV=production bundle exec fastlane ios simulator

unsigned-apk: | setup ## Build an unsigned version of the Android app
	@./node_modules/.bin/jetify
	@cd fastlane && NODE_ENV=production bundle exec fastlane android unsigned

## Help documentation https://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
