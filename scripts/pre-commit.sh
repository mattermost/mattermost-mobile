#!/usr/bin/env bash

jsfiles=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.js$|\.ts$|\.tsx$')
exit_code=0

if [ -z "jsfiles" ]; then
    exit 0
fi

if [ -n "$jsfiles" ]; then
    echo "Checking lint for:"
    for js in $jsfiles; do
        echo "$js"
        e=$(node_modules/.bin/eslint --quiet --fix --config eslint.precommit.config.mjs $js)
        if [ -n "$e" ]; then
            echo "ERROR: Check eslint hints."
            echo "$e"
            exit_code=1
        fi
    done

    echo "Checking for TSC (fast incremental check)"
    # Use incremental TypeScript checking - much faster on subsequent runs
    tsc=$(node_modules/.bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.precommit 2>&1)
    if [ $? -ne 0 ]; then
        echo "ERROR: TypeScript issues found."
        echo "$tsc"
        exit_code=1
    fi
fi

# scripts/precommit/i18n.sh

exit $exit_code
