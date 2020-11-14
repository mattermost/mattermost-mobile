#!/bin/sh

sentry_properties="defaults.url=https://sentry.io
defaults.org=${SENTRY_ORG}
defaults.project=${SENTRY_PROJECT_IOS}
auth.token=${SENTRY_AUTH_TOKEN}
cli.executable=../node_modules/@sentry/cli/bin/sentry-cli"

if [[ "${SENTRY_ENABLED}" = "true" ]]; then
	if [[ ! -f "sentry.properties" ]]; then
		echo "Creating sentry.properties from environment"

		echo "${sentry_properties}" > sentry.properties
	else
		echo "sentry.properties already exists"
	fi
else
	echo "Not creating sentry.properties because Sentry is disabled"
fi
