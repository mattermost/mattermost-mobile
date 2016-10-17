.PHONY: run check-style test clean

.npminstall: package.json
	@echo Getting dependencies using npm

	npm install

	touch $@

config/config.secret.json:
	@echo Generating default config/config.secret.json
	@echo '{}' > config/config.secret.json

run: .npminstall config/config.secret.json
	@echo Running Mobile iOS Apps for development

	react-native run-ios

test: .npminstall config/config.secret.json
	npm test

check-style: .npminstall
	@echo Checking for style guide compliance

	npm run check

clean:
	@echo Cleaning app

	rm -rf node_modules
	rm -f .npminstall