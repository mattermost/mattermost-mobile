#!/bin/sh

jsfiles=$(git diff --cached --name-only --diff-filter=ACM | grep -E '.js$|.ts$')

if [ -z "jsfiles" ]; then
    exit 0
fi

if [ -n "$jsfiles" ]; then
    echo "Checking lint for:"
    for js in $jsfiles; do
        echo "$js"
        e=$(node_modules/.bin/eslint --quiet $js)
        if [[ -n "$e" ]]; then
            echo "$e"
            echo "ERROR: Check eslint hints."
            exit 1 # reject
        fi
    done
    echo "Checking TypeScript"
    npm run tsc
fi

exit 0
