#!/bin/sh

# Disable the below if you are not using Sentry
export SENTRY_ENABLED=true

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	echo "Uploading debugging symbols to Sentry"

	./makeSentryProperties.sh

	export SENTRY_PROPERTIES=sentry.properties
../node_modules/@sentry/cli/bin/sentry-cli upload-dif "$DWARF_DSYM_FOLDER_PATH"

else
	echo "Not uploading debugging symbols to Sentry because Sentry is disabled"
fi
