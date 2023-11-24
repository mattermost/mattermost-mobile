#!/bin/bash
set -eu -o pipefail

log () {
  echo "[$(date +%Y-%m-%dT%H:%M:%S%Z)]" "$@"
}

cd "$(dirname "$0")"/..
LATEST_BUILD_NUMBER=$(./scripts/get_latest_build_number.sh)
BUILD_NUMBER=$(($LATEST_BUILD_NUMBER + 1))
log "Build number to use for the beta build: $BUILD_NUMBER"

log "Generating env file required by Fastlane..."
tee .env <<EOF
export INCREMENT_BUILD_NUMBER=true
export BUILD_NUMBER=${BUILD_NUMBER}
export COMMIT_CHANGES_TO_GIT=true
export BRANCH_TO_BUILD=main
export GIT_LOCAL_BRANCH=bump-build
EOF

log "Running the fastlane branch generation script"
(. .env && cd fastlane && bundle exec fastlane set_app_build_number)

# TODO implement
git branch -l -a
