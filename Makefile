.PHONY: run check-style test clean

.npminstall: package.json
	@if ! [ $(shell command -v npm) ]; then \
		echo "npm is not installed"; \
		exit 1; \
	fi

	@echo Getting dependencies using npm

	npm install

	touch $@

config/config.secret.json:
	if ! [ -f config/config.secret.json ]; then
		@echo Generating default config/config.secret.json
		@echo '{}' > config/config.secret.json
	fi

run: .npminstall config/config.secret.json
	@echo Running Mobile iOS Apps for development

	npm run run-ios

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
