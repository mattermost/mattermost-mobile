#!/bin/bash
set -eu -o pipefail
cd "$(dirname "$0")"/..

log () { echo "[$(date +%Y-%m-%dT%H:%M:%S%Z)]" "$@"; }
is_false () { grep -qiE '^(no?|false)$' <<<$1; }

: ${BRANCH_TO_BUILD:=main}
: ${PR_REVIEWERS:=mattermost/core-build-engineers}
: ${BUMP_BUILD_NUMBER:=true}
: ${BUMP_VERSION:=false}     # If enabled, you must populate the VERSION variable as well
: ${LOCAL_MODE:=yes}         # Disable LOCAL_MODE to push the commit to origin, and create a corresponding PR
LATEST_BUILD_NUMBER=$(./scripts/get_latest_build_number.sh)
BUILD_NUMBER=$(($LATEST_BUILD_NUMBER + 1))
GIT_LOCAL_BRANCH=bump-build-${BRANCH_TO_BUILD}-${BUILD_NUMBER}
log "Build number to use for the beta build: $BUILD_NUMBER"

log "Asserting that the workdir is clean"
if ! git diff --quiet; then
  log "Error, workdir is not clean: aborting" >&2
  exit 1
fi

#log "Saving the currently checked out branch"
#CURRENT_BRANCH=$(git branch --show-current)
#trap "git checkout $CURRENT_BRANCH" EXIT
#
#log "Creating branch '${GIT_LOCAL_BRANCH}' based on branch '$BRANCH_TO_BUILD'"
#git checkout $BRANCH_TO_BUILD
#git pull
#git checkout -b $GIT_LOCAL_BRANCH

log "Generating env file required by Fastlane..."
tee .env <<EOF
export BRANCH_TO_BUILD=${BRANCH_TO_BUILD}
export GIT_LOCAL_BRANCH=${GIT_LOCAL_BRANCH}
export COMMIT_CHANGES_TO_GIT=true
$(is_false $BUMP_BUILD_NUMBER || echo "\
export INCREMENT_BUILD_NUMBER=true
export BUILD_NUMBER=${BUILD_NUMBER}
")
$(is_false $BUMP_VERSION || echo "\
export INCREMENT_VERSION_NUMBER=true
export VERSION=${VERSION}
")
EOF

echo "DEBUG, exit"
exit 0

log "Running the fastlane build number bumper script"
(. .env && cd fastlane && bundle install && bundle exec fastlane set_app_build_number)

if is_false $LOCAL_MODE; then
  log "Pushing branch ${GIT_LOCAL_BRANCH}, and creating a corresponding PR to ${BRANCH_TO_BUILD}"
  git push origin ${GIT_LOCAL_BRANCH}

  log "Creating PR"
  gh pr create \
    --repo mattermost/mattermost-mobile \
    --base main \
    --head "${GIT_LOCAL_BRANCH}" \
    --reviewer "${PR_REVIEWERS}" \
    --title "Bump app build number to $BUILD_NUMBER" \
    --body-file - <<EOF
#### Summary
Bump app build number to $BUILD_NUMBER

#### Release Note
\`\`\`release-note
NONE
\`\`\`
EOF
else
  log "Running with LOCAL_MODE enabled: skipping branch push and PR creation"
  log "Run with LOCAL_MODE=false to disable dry run mode"
fi
