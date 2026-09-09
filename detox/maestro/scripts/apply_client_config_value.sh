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
# Exits 0 once the client config serves <expected-value>, 1 if it never does, 2 on usage error.
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

read_key() {
    local response
    if ! response="$(curl -f -sS --show-error \
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

actual=""
for attempt in 1 2 3; do
    if ! curl -f -sS --show-error -X PUT \
        -H "Authorization: Bearer ${admin_token}" \
        -H "Content-Type: application/json" \
        -d "$patch_json" \
        "${site_url}/api/v4/config/patch" > /dev/null; then
        echo "==> config/patch call failed on attempt ${attempt}" >&2
        actual="<config/patch call failed>"
        continue
    fi

    # Poll rather than read once: a clustered installation propagates a patch asynchronously.
    deadline=$(( SECONDS + 10 ))
    while :; do
        actual="$(read_key)"
        if [[ "$actual" == "$expected" ]]; then
            echo "==> Verified ${key}=${actual} in the client config (attempt ${attempt})"
            exit 0
        fi
        if (( SECONDS >= deadline )); then
            break
        fi
        sleep 2
    done

    echo "==> ${key} is '${actual}' after attempt ${attempt}, re-applying the patch" >&2
done

echo "==> ${key} never took: wanted '${expected}', client config serves '${actual}'" >&2
exit 1
