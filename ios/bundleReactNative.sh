#!/bin/sh

[[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh

export NODE_OPTIONS=--max_old_space_size=12000
export BUNDLE_COMMAND="bundle"
export ENTRY_FILE="index.tsx"

set -e
WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
SENTRY_XCODE="../node_modules/@sentry/react-native/scripts/sentry-xcode.sh"

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	echo "Sentry native integration is enabled"
	chmod +x $SENTRY_XCODE

	export SENTRY_PROPERTIES=sentry.properties
	/bin/sh -c "$WITH_ENVIRONMENT $SENTRY_XCODE"
else
	echo "Sentry native integration is not enabled"
	/bin/sh -c "$WITH_ENVIRONMENT"
fi
