#!/bin/bash
# Plan one Detox lane's Test System IO runs and write them to GITHUB_OUTPUT.
# The checkout is the commit under test. Begin jobs later delete the specs
# that do not belong to their run; this step only counts.

set -euo pipefail

: "${LANE:?}"
: "${SEARCH_PATH:?}"
: "${PLATFORM:?}"
: "${PARALLELISM:?}"
: "${GITHUB_OUTPUT:?}"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_RUN_ID:?}"
: "${GITHUB_RUN_ATTEMPT:?}"
: "${GITHUB_REF_NAME:?}"

PR_NUMBER="${PR_NUMBER:-}"
COMMIT_SHA="${COMMIT_SHA:-}"

if ! [[ "$LANE" =~ ^[a-z0-9-]+$ ]]; then
  echo "::error::lane must be lowercase letters, digits, and hyphens"
  exit 1
fi
if [ -n "$PR_NUMBER" ] && ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "::error::pr_number must be a pull request number, or empty"
  exit 1
fi

sha=$(git rev-parse HEAD)
if ! [[ "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "::error::the checkout is not a full SHA"
  exit 1
fi
if [ -n "$COMMIT_SHA" ] && [ "$sha" != "$COMMIT_SHA" ]; then
  echo "::error::checkout ${sha} is not the commit under test ${COMMIT_SHA}"
  exit 1
fi
if ! grep -rqE '^export function isE2eTestStack\(' detox/provision; then
  echo "::error::the code under test predates e2e-test-stack provisioning; merge main into it"
  exit 1
fi

branch="${GITHUB_REF_NAME}"
if [ -n "$PR_NUMBER" ]; then
  head=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}" --jq .head.ref || true)
  if [ -n "$head" ]; then
    branch="$head"
  else
    echo "::warning::could not read the pull request head ref; using ${branch}"
  fi
fi

plan=$(node .github/scripts/tsio-detox-specs.js plan \
  --search-path "$SEARCH_PATH" \
  --platform "$PLATFORM" \
  --parallelism "$PARALLELISM")

identity() {
  local name="$1"
  if [ -n "$PR_NUMBER" ]; then
    jq -nc \
      --arg repo "$GITHUB_REPOSITORY" \
      --arg sha "$sha" \
      --arg run_id "$GITHUB_RUN_ID" \
      --arg name "$name" \
      --arg attempt "$GITHUB_RUN_ATTEMPT" \
      --arg branch "$branch" \
      --arg pr "$PR_NUMBER" \
      '{repository:$repo, commit_sha:$sha, gh_run_id:$run_id, gh_run_attempt:$attempt, name:$name, branch:$branch, gh_pr_number:$pr}'
  else
    jq -nc \
      --arg repo "$GITHUB_REPOSITORY" \
      --arg sha "$sha" \
      --arg run_id "$GITHUB_RUN_ID" \
      --arg name "$name" \
      --arg attempt "$GITHUB_RUN_ATTEMPT" \
      --arg branch "$branch" \
      '{repository:$repo, commit_sha:$sha, gh_run_id:$run_id, gh_run_attempt:$attempt, name:$name, branch:$branch}'
  fi
}

workers=$(jq -c --arg lane "$LANE" '
  [range(1; .poolWorkers + 1) | {name: ("dispatch-run-" + $lane + "-" + tostring), shard: tostring, role: "pool", target: "A", run: "pool"}]
  + (if .mutationB then [{name: ("dispatch-run-" + $lane + "-mutation-b"), shard: .mutationBShard, role: "mutation", target: "B", run: "mutation-b"}] else [] end)
  + (if .mutationSite3 then [{name: ("dispatch-run-" + $lane + "-mutation-site3"), shard: "1", role: "mutation", target: "site3", run: "mutation-site3"}] else [] end)
' <<< "$plan")

{
  echo "mobile-sha=${sha}"
  echo "branch=${branch}"
  echo "pool-workers=$(jq -r .poolWorkers <<< "$plan")"
  echo "mutation-b=$(jq -r .mutationB <<< "$plan")"
  echo "mutation-site3=$(jq -r .mutationSite3 <<< "$plan")"
  echo "webhook=$(jq -r .webhook <<< "$plan")"
  echo "stack-count=$(jq -r .stackCount <<< "$plan")"
  echo "slices=$(jq -c .slices <<< "$plan")"
  echo "detox-search-path=$(jq -r .detoxSearchPath <<< "$plan")"
  echo "pool-identity=$(identity "$LANE")"
  echo "mutation-b-identity=$(identity "${LANE}-mutation-b")"
  echo "mutation-site3-identity=$(identity "${LANE}-mutation-site3")"
  echo "workers=${workers}"
} >> "$GITHUB_OUTPUT"

{
  echo "### Specs"
  echo
  jq -r '"Pool \(.poolSpecs) specs on \(.poolWorkers) workers. Mutation B \(.mutationBSpecs). Mutation site3 \(.mutationSite3Specs). Servers \(.stackCount)."' <<< "$plan"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
