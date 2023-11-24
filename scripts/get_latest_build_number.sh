#!/bin/bash
set -eu -o pipefail

print_all_remote_refs () {
  git for-each-ref --format='%(refname:lstrip=2)' refs/remotes | grep -vE '/HEAD$'
}

BUILD_NUMBERS=""
for REMOTE_BRANCH in $(print_all_remote_refs); do
  # Purposely swallow errors here, and continue to loop if the file we get the versionCode from is absent
  BUILD_NUMBER=$(git cat-file -p ${REMOTE_BRANCH}:android/app/build.gradle | grep -E 'versionCode [0-9]+' | awk '{ print $2; }') || continue
  BUILD_NUMBERS="$BUILD_NUMBERS $BUILD_NUMBER"
done
LATEST_BUILD_NUMBER=$(echo $BUILD_NUMBERS | tr ' ' '\n' | sort --numeric-sort | tail -n1)
echo $LATEST_BUILD_NUMBER
