#!/bin/bash
set -eu -o pipefail

print_all_remote_refs () {
  git for-each-ref --format='%(refname:lstrip=2)' refs/remotes | grep -vE '/HEAD$'
}

BUILD_NUMBERS=""
for REMOTE_BRANCH in $(print_all_remote_refs); do
  # Intentionally ignore errors here: we don't want invalid brances, e.g. where the required file is removed, to make this script fail
  BUILD_NUMBER=$(git cat-file -p ${REMOTE_BRANCH}:android/app/build.gradle | grep -E 'versionCode [0-9]+' | awk '{ print $2; }') || continue
  BUILD_NUMBERS="$BUILD_NUMBERS $BUILD_NUMBER"
done
LATEST_BUILD_NUMBER=$(echo $BUILD_NUMBERS | tr ' ' '\n' | sort --numeric-sort | tail -n1)
echo $LATEST_BUILD_NUMBER
