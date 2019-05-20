#!/bin/sh

export NODE_OPTIONS=--max_old_space_size=12000
export NODE_BINARY=node

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	echo "Sentry native integration is enabled"

	./makeSentryProperties.sh

	export SENTRY_PROPERTIES=sentry.properties
	../node_modules/@sentry/cli/bin/sentry-cli react-native xcode ./react-native-xcode.sh
else
	echo "Sentry native integration is not enabled"
	./react-native-xcode.sh
fi
