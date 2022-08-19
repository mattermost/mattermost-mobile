#!/usr/bin/env bash

jsfiles=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.js$|\.ts$|\.tsx$')

if [ -z "jsfiles" ]; then
    exit 0
fi

if [ -n "$jsfiles" ]; then
    echo "Checking lint for:"
    for js in $jsfiles; do
        echo "$js"
        e=$(node_modules/.bin/eslint --quiet --fix $js)
        if [ -n "$e" ]; then
            echo "ERROR: Check eslint hints."
            echo "$e"
            exit 1 # reject
        fi
    done

    echo "Checking for TSC"
    tsc=$(node_modules/.bin/tsc --noEmit)
    if [ -n "$tsc" ]; then
        echo "ERROR: Check TSC hints."
        echo "$tsc"
        exit 1 # reject
    fi
fi

# scripts/precommit/i18n.sh

exit 0
