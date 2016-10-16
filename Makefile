.PHONY: build run clean test

check-style: .npminstall
	@echo Checking for style guide compliance

	npm run check

.npminstall: package.json
	@echo Getting dependencies using npm

	npm install

	touch $@

config/config.json:
	@echo Setting up default config
	@mkdir -p config
	@cp config.default.json config/config.json

build: .npminstall
	@echo Building Mobile app

	rm -rf dist

	npm run build

run: .npminstall config/config.json
	@echo Running Mobile iOS Apps for development

	react-native run-ios

clean:
	@echo Cleaning app

	rm -rf dist
	rm -rf node_modules
	rm -f .npminstall


test: .npminstall
	npm test
