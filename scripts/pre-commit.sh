#!/bin/sh

jsfiles=$(git diff --cached --name-only --diff-filter=ACM | grep -E '.js$|.ts$')

if [ -z "jsfiles" ]; then
    exit 0
fi

if [ -n "$jsfiles" ]; then
    echo "Checking lint for:"
    for js in $jsfiles; do
        echo "$js"
        e=$(node_modules/.bin/eslint --quiet --fix $js)
        if [[ -n "$e" ]]; then
            echo "$e"
            echo "ERROR: Check eslint hints."
            exit 1 # reject
        fi
    done
    echo "Checking TypeScript"
    tsce=$(npm run tsc)
    if [[-n "$tsce"]]; then
        echo "$tsce"
        echo "ERROR: Check TSC hints."
        exit 1 # reject
    fi
fi

exit 0
