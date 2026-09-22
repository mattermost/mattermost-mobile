#!/bin/bash
# Apply a config patch and do not return until the *client* config actually serves the value.
#
# WHY: two config writes close together can lose the later one. In run 34344304929 the mail-mode
# step's EXIT trap restored ReportAProblemType=default at 12:03:20.977 and the link-mode step
# patched ReportAProblemType=link 58 ms later at 12:03:21.035; both curls returned success, yet the
# app observed 'default'. handleReport()'s 'default' branch emails on a licensed server, which is
# why the tap produced android.intent.action.SEND_MULTIPLE to Gmail and the browser never opened --
# across the whole job there is not one android.intent.action.VIEW. Reproduced on a live 11.11.0
# server with the value correctly in force: the same flow fires ACTION_VIEW into
# com.android.chrome and passes. So the flow and the app are fine; only the config write was lost.
#
# Patch, then poll the client config -- the payload the app consumes. A patch that was lost is
# re-applied rather than silently accepted; a value that genuinely will not stick still fails.
#
# Usage: apply_client_config_value.sh <site-url> <admin-token> <patch-json> <key> <expected-value>
# Exit 0: the client config serves <expected-value>.
#         A read that matches is only meaningful because exit 3 below has already ruled out
#         an installation that would answer 200 and keep its own value. Callers that need the
#         value to still be in force later must check it where it matters -- this script does
#         not hold it, and no wait here could prove that it will.
# Exit 3: this installation forbids the write. Checked FIRST, before any patch attempt, since
#         both signals are deterministic and retrying cannot change them. Two causes are
#         checked and both are printed:
#         the key being supplied by an environment variable (Mattermost keeps the env value
#         and silently ignores config/patch while answering 200 -- this is what the PR
#         Spinwicks do, proven in run 34452126763: "RestrictSystemAdmin=false,
#         set-by-environment=true"), or ExperimentalSettings.RestrictSystemAdmin being true
#         (drops every write_restrictable/cloud_restrictable field). Caller should skip.
# Exit 1: the value never took for some other reason. Exit 2: usage error.
set -euo pipefail

if [[ $# -ne 5 ]]; then
    echo "usage: $0 <site-url> <admin-token> <patch-json> <key> <expected-value>" >&2
    exit 2
fi

site_url="$1"
admin_token="$2"
patch_json="$3"
key="$4"
expected="$5"

# Every request here is a small JSON read or patch against one server. Without a ceiling a
# stalled connection blocks curl indefinitely: the script cannot reach its retry or exit path
# and the caller burns its whole CI job timeout on one unanswered socket.
CONNECT_TIMEOUT_SECS="${CONFIG_CONNECT_TIMEOUT_SECS:-5}"
MAX_TIME_SECS="${CONFIG_MAX_TIME_SECS:-30}"
POLL_WINDOW_SECS="${CONFIG_POLL_WINDOW_SECS:-10}"

# $1: seconds this read may take. The poll deadline below is shorter than MAX_TIME_SECS, so a
# read given the full budget could outlive the loop it belongs to and overshoot the deadline.
read_key() {
    local budget="${1:-$MAX_TIME_SECS}"
    local response
    if ! response="$(curl -f -sS --show-error \
        --connect-timeout "${CONNECT_TIMEOUT_SECS}" --max-time "${budget}" \
        -H "Authorization: Bearer ${admin_token}" \
        "${site_url}/api/v4/config/client?format=old" 2>/dev/null)"; then
        printf '%s' "<client config could not be read>"
        return
    fi
    printf '%s' "$response" | python3 -c "
import json, sys
key = sys.argv[1]
try:
    config = json.load(sys.stdin)
except ValueError:
    print('<client config was not JSON>')
    sys.exit(0)
print(config.get(key, '<key absent from client config>'))
" "$key"
}

# Whether this installation will accept the write at all. Both answers are deterministic --
# neither depends on how quickly a value propagates, so they are asked before any patching
# rather than only after attempts have been spent:
#   1. ExperimentalSettings.RestrictSystemAdmin drops every write_restrictable /
#      cloud_restrictable field (server/channels/api4/config.go, makeFilterConfigByPermission).
#   2. The field is supplied by an environment variable. Mattermost keeps the env value and
#      silently ignores config/patch while answering 200; GET /api/v4/config/environment
#      reports which fields those are. Cloud provisioners configure installations this way.
read_restricted() {
    # Guard the read like read_key does. Piping a failed curl into python prints its own
    # 'unknown' and then the || prints a second one, and the caller reports both.
    local body
    if ! body="$(curl -f -sS --show-error \
        --connect-timeout "${CONNECT_TIMEOUT_SECS}" --max-time "${MAX_TIME_SECS}" \
        -H "Authorization: Bearer ${admin_token}" \
        "${site_url}/api/v4/config" 2>/dev/null)"; then
        printf 'unknown'
        return
    fi
    printf '%s' "$body" | python3 -c "
import json, sys
try:
    config = json.load(sys.stdin)
except ValueError:
    print('unknown')
    sys.exit(0)
print(str(config.get('ExperimentalSettings', {}).get('RestrictSystemAdmin', 'unknown')).lower())
"
}

read_env_managed() {
    local body
    if ! body="$(curl -f -sS --show-error \
        --connect-timeout "${CONNECT_TIMEOUT_SECS}" --max-time "${MAX_TIME_SECS}" \
        -H "Authorization: Bearer ${admin_token}" \
        "${site_url}/api/v4/config/environment" 2>/dev/null)"; then
        printf 'unknown'
        return
    fi
    printf '%s' "$body" | python3 -c "
import json, sys
patch = sys.argv[1]
try:
    env = json.load(sys.stdin)
    fields = json.loads(patch)
except ValueError:
    print('unknown')
    sys.exit(0)
for section, values in fields.items():
    if not isinstance(values, dict):
        continue
    section_env = env.get(section, {})
    for field in values:
        if section_env.get(field):
            print('true')
            sys.exit(0)
print('false')
" "$patch_json"
}

# Ask first. An installation that owns the field will answer 200 to every patch and keep its
# own value, so retrying cannot help and a read that briefly matches is not evidence.
restricted="$(read_restricted)"
env_managed="$(read_env_managed)"
if [[ "$restricted" == "true" || "$env_managed" == "true" ]]; then
    echo "==> ${key} is owned by this installation (RestrictSystemAdmin=${restricted}, set-by-environment=${env_managed}), so the flow's pre-condition cannot be created here." >&2
    exit 3
fi

actual=""
for attempt in 1 2 3; do
    if ! curl -f -sS --show-error -X PUT \
        --connect-timeout "${CONNECT_TIMEOUT_SECS}" --max-time "${MAX_TIME_SECS}" \
        -H "Authorization: Bearer ${admin_token}" \
        -H "Content-Type: application/json" \
        -d "$patch_json" \
        "${site_url}/api/v4/config/patch" > /dev/null; then
        echo "==> config/patch call failed on attempt ${attempt}" >&2
        actual="<config/patch call failed>"
        continue
    fi

    # Poll rather than read once: a clustered installation propagates a patch asynchronously.
    deadline=$(( SECONDS + POLL_WINDOW_SECS ))
    while :; do
        # Check the clock first, and give the read only what is left of the window.
        remaining=$(( deadline - SECONDS ))
        if (( remaining <= 0 )); then
            break
        fi
        actual="$(read_key "$remaining")"
        if [[ "$actual" == "$expected" ]]; then
            echo "==> Verified ${key}=${actual} in the client config (attempt ${attempt})"
            exit 0
        fi
        sleep 2
    done

    echo "==> ${key} is '${actual}' after attempt ${attempt}, re-applying the patch" >&2
done

# The installation said it would accept the write, so re-ask rather than assume: the answer
# can change mid-run, and printing both signals keeps the next run diagnosable.
restricted="$(read_restricted)"
env_managed="$(read_env_managed)"

echo "==> ${key} never took: wanted '${expected}', client config serves '${actual}' (RestrictSystemAdmin=${restricted}, set-by-environment=${env_managed})" >&2

if [[ "$restricted" == "true" || "$env_managed" == "true" ]]; then
    echo "==> This installation does not allow that write, so the flow's pre-condition cannot be created here." >&2
    exit 3
fi

exit 1
