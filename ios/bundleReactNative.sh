#!/bin/sh

[[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh

export NODE_OPTIONS=--max_old_space_size=12000
export BUNDLE_COMMAND="bundle"
export ENTRY_FILE="index.ts"

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	echo "Sentry native integration is enabled"

	export SENTRY_PROPERTIES=sentry.properties
	../node_modules/@sentry/cli/bin/sentry-cli react-native xcode \
    ../node_modules/react-native/scripts/react-native-xcode.sh
else
	echo "Sentry native integration is not enabled"
	../node_modules/react-native/scripts/react-native-xcode.sh
fi
