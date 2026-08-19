#!/bin/bash
# Start the Detox mm_blocks webhook sidecar with a *public* base URL.
#
# Mattermost cloud must call back into the runner. trycloudflare.com quick tunnels
# are the historical default and are DNS-flaky — unbounded DNS retries there have
# stalled a shard long enough to skip its tests — so prefer a stable ingress when
# one is configured.
#
# Priority:
#   1) WEBHOOK_PUBLIC_BASE_URL — already-routable HTTPS origin (named tunnel / proxy)
#   2) CLOUDFLARED_TUNNEL_TOKEN + WEBHOOK_PUBLIC_BASE_URL — named Cloudflare tunnel
#   3) trycloudflare quick tunnel — last resort, hard-bounded
#
# This script always exits 0 after best-effort setup so the shard is never blocked
# on Cloudflare. mm_blocks specs fail fast via requireWebhookServer when the URL
# is unset. Pair with dedicated mm_blocks sharding so unrelated specs never share
# this step's fate.
#
# Local usage is documented in detox/README.md ("Webhook sidecar").

set -uo pipefail

detox_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cloudflared="${RUNNER_TEMP:-/tmp}/cloudflared"
webhook_log="${RUNNER_TEMP:-/tmp}/mattermost-webhook-sidecar.log"
tunnel_log="${RUNNER_TEMP:-/tmp}/mattermost-webhook-tunnel.log"
pid_file="${RUNNER_TEMP:-/tmp}/mattermost-webhook-sidecar.pid"
tunnel_pid_file="${RUNNER_TEMP:-/tmp}/mattermost-webhook-tunnel.pid"

CURL_CONNECT_TIMEOUT="${WEBHOOK_CURL_CONNECT_TIMEOUT:-5}"
CURL_MAX_TIME="${WEBHOOK_CURL_MAX_TIME:-10}"
TUNNEL_ATTEMPTS="${WEBHOOK_TUNNEL_ATTEMPTS:-2}"
TUNNEL_WAIT_SECS="${WEBHOOK_TUNNEL_WAIT_SECS:-20}"
# Hard wall-clock budget for the whole trycloudflare path; without it a DNS stall
# can eat most of the shard.
TUNNEL_TOTAL_BUDGET_SECS="${WEBHOOK_TUNNEL_TOTAL_BUDGET_SECS:-120}"

curl_quick() {
    curl --fail --silent --show-error \
        --connect-timeout "$CURL_CONNECT_TIMEOUT" \
        --max-time "$CURL_MAX_TIME" \
        --retry 2 \
        --retry-delay 1 \
        --retry-connrefused \
        "$@"
}

mark_ready() {
    local url="$1"
    # stable=true only for WEBHOOK_PUBLIC_BASE_URL / named tunnel. trycloudflare
    # passes curl health but Mattermost→tunnel callbacks hang.
    local callbacks_reachable="${2:-true}"
    if [[ -n "${GITHUB_ENV:-}" ]]; then
        {
            echo "WEBHOOK_BASE_URL=$url"
            echo "WEBHOOK_SIDECAR_READY=true"
            echo "WEBHOOK_CALLBACKS_REACHABLE=$callbacks_reachable"
        } >>"$GITHUB_ENV"
    fi
    export WEBHOOK_BASE_URL="$url"
    export WEBHOOK_CALLBACKS_REACHABLE="$callbacks_reachable"
    echo "Webhook sidecar is reachable at $url (callbacks_reachable=$callbacks_reachable)"
}

mark_unavailable() {
    local reason="$1"
    # Not "will fail" — they skip. mm_blocks_incoming_webhook wraps its whole describe in
    # describe.skip and mm_blocks_ephemeral gates the callback cases with it.skip when
    # hasStableWebhookIngress is false. Wording this as a failure made a benign, expected
    # condition read like a broken shard.
    echo "::warning::Webhook sidecar unavailable — mm_blocks specs needing Cloud→sidecar callbacks will SKIP (hasStableWebhookIngress=false). ${reason}"
    if [[ -n "${GITHUB_ENV:-}" ]]; then
        {
            echo "WEBHOOK_BASE_URL="
            echo "WEBHOOK_SIDECAR_READY=false"
            echo "WEBHOOK_CALLBACKS_REACHABLE=false"
        } >>"$GITHUB_ENV"
    fi
    if [[ -f "$tunnel_log" ]]; then
        echo "---- cloudflared tunnel log (tail) ----" >&2
        tail -n 40 "$tunnel_log" >&2 || true
    fi
    if [[ -f "$webhook_log" ]]; then
        echo "---- webhook sidecar log (tail) ----" >&2
        tail -n 40 "$webhook_log" >&2 || true
    fi
}

cleanup_tunnel() {
    if [[ -f "$tunnel_pid_file" ]]; then
        local tpid
        tpid="$(cat "$tunnel_pid_file" 2>/dev/null || true)"
        if [[ -n "${tpid:-}" ]] && kill -0 "$tpid" 2>/dev/null; then
            kill "$tpid" 2>/dev/null || true
            wait "$tpid" 2>/dev/null || true
        fi
        rm -f "$tunnel_pid_file"
    fi
}

# Pinned so a bad upstream release cannot break mm_blocks shards; bump deliberately.
CLOUDFLARED_VERSION="${CLOUDFLARED_VERSION:-2026.7.3}"

ensure_cloudflared() {
    case "$(uname -s)-$(uname -m)" in
        Linux-x86_64) cloudflared_asset="cloudflared-linux-amd64" ;;
        Darwin-arm64) cloudflared_asset="cloudflared-darwin-arm64.tgz" ;;
        Darwin-x86_64) cloudflared_asset="cloudflared-darwin-amd64.tgz" ;;
        *)
            return 1
            ;;
    esac

    if [[ -x "$cloudflared" ]]; then
        return 0
    fi

    local download_url="https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${cloudflared_asset}"
    if [[ "$cloudflared_asset" == *.tgz ]]; then
        local archive="${cloudflared}.tgz"
        curl_quick --location "$download_url" --output "$archive" || return 1
        tar -xzf "$archive" -C "$(dirname "$cloudflared")" || return 1
    else
        curl_quick --location "$download_url" --output "$cloudflared" || return 1
    fi
    chmod +x "$cloudflared"
}

stop_local_sidecar() {
    if [[ -f "$pid_file" ]]; then
        local wpid
        wpid="$(cat "$pid_file" 2>/dev/null || true)"
        if [[ -n "${wpid:-}" ]] && kill -0 "$wpid" 2>/dev/null; then
            kill "$wpid" 2>/dev/null || true
            wait "$wpid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    fi
}

# Optional arg: public base URL baked into callback URLs (webhook_server.js reads
# WEBHOOK_BASE_URL once at process start — must restart after trycloudflare resolves).
start_local_sidecar() {
    local public_base_url="${1:-${WEBHOOK_PUBLIC_BASE_URL:-${WEBHOOK_BASE_URL:-}}}"

    if [[ -z "${SITE_1_URL:-}" ]]; then
        mark_unavailable "SITE_1_URL is required"
        return 1
    fi

    stop_local_sidecar
    if ! cd "$detox_dir"; then
        mark_unavailable "Cannot cd to $detox_dir"
        return 1
    fi
    : >"$webhook_log"
    nohup env SITE_URL="$SITE_1_URL" \
        ADMIN_USERNAME="${ADMIN_USERNAME:-}" \
        ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
        WEBHOOK_BASE_URL="$public_base_url" \
        node webhook_server.js >"$webhook_log" 2>&1 &
    echo "$!" >"$pid_file"

    # Bare probe, not curl_quick: --retry-connrefused would retry the very signal
    # "not up yet" this loop polls for, stretching each iteration past its 1s budget.
    local local_ok=0
    for _ in $(seq 1 30); do
        if curl --fail --silent --output /dev/null --connect-timeout 1 --max-time 2 \
            http://127.0.0.1:3000/ 2>/dev/null; then
            local_ok=1
            break
        fi
        sleep 1
    done
    if [[ "$local_ok" -ne 1 ]]; then
        mark_unavailable "Local webhook_server.js did not become healthy on :3000"
        return 1
    fi
    return 0
}

# --- Prefer stable public origin (no trycloudflare) ---
if [[ -n "${WEBHOOK_PUBLIC_BASE_URL:-}" ]]; then
    if ! start_local_sidecar; then
        exit 0
    fi

    if [[ -n "${CLOUDFLARED_TUNNEL_TOKEN:-}" ]]; then
        if ! ensure_cloudflared; then
            mark_unavailable "Failed to install cloudflared for named tunnel"
            exit 0
        fi
        cleanup_tunnel
        # Token via TUNNEL_TOKEN, not --token: argv is world-readable via /proc on the runner.
        nohup env TUNNEL_TOKEN="$CLOUDFLARED_TUNNEL_TOKEN" \
            "$cloudflared" tunnel --no-autoupdate run >"$tunnel_log" 2>&1 &
        echo "$!" >"$tunnel_pid_file"
        # Named tunnels use a fixed hostname; give the process a moment to attach.
        sleep 3
    fi

    if curl_quick "${WEBHOOK_PUBLIC_BASE_URL}/" >/dev/null 2>&1; then
        mark_ready "${WEBHOOK_PUBLIC_BASE_URL%/}" true
        exit 0
    fi

    # Do not claim READY when the local health check failed — otherwise
    # requireWebhookServer thinks the sidecar is fine and tests hang on callbacks.
    mark_unavailable "WEBHOOK_PUBLIC_BASE_URL did not pass a local health check (${WEBHOOK_PUBLIC_BASE_URL})"
    exit 0
fi

# --- Last resort: trycloudflare quick tunnel (flaky DNS) ---
#
# Only reachable when WEBHOOK_PUBLIC_BASE_URL is unset, and in that case it cannot turn a
# single spec on, so do not spend the budget on it. Two independent guards make a quick
# tunnel useless for the tests:
#
#   * a tunnel that comes up is marked `mark_ready "$url" false`, i.e.
#     WEBHOOK_CALLBACKS_REACHABLE=false, because Mattermost→tunnel callbacks hang; and
#   * test_config's hasStableWebhookIngress excludes any *.trycloudflare.com origin
#     outright.
#
# hasStableWebhookIngress is the only flag the specs read — hasWebhookSidecar is exported
# but has no consumers. So the end state is identical whether the tunnel succeeds or
# fails, and the attempt costs a cloudflared download plus up to
# TUNNEL_TOTAL_BUDGET_SECS (120s) x TUNNEL_ATTEMPTS on the mm_blocks shard of every run.
#
# Opt back in with WEBHOOK_ALLOW_TRYCLOUDFLARE=true for local experimentation.
if [[ "${WEBHOOK_ALLOW_TRYCLOUDFLARE:-}" != "true" ]]; then
    mark_unavailable "no stable webhook ingress configured — set WEBHOOK_PUBLIC_BASE_URL (+ optional CLOUDFLARED_TUNNEL_TOKEN). The trycloudflare quick tunnel was skipped because it cannot satisfy hasStableWebhookIngress; set WEBHOOK_ALLOW_TRYCLOUDFLARE=true to attempt it anyway."
    exit 0
fi

if ! ensure_cloudflared; then
    mark_unavailable "Failed to download cloudflared (or unsupported platform $(uname -s)-$(uname -m))"
    exit 0
fi

if ! start_local_sidecar; then
    exit 0
fi

webhook_base_url=""
attempt=1
deadline=$((SECONDS + TUNNEL_TOTAL_BUDGET_SECS))
while (( attempt <= TUNNEL_ATTEMPTS && SECONDS < deadline )); do
    echo "Cloudflare quick tunnel attempt ${attempt}/${TUNNEL_ATTEMPTS} (budget ${TUNNEL_TOTAL_BUDGET_SECS}s)..."
    cleanup_tunnel
    : >"$tunnel_log"
    nohup "$cloudflared" tunnel --no-autoupdate --url http://127.0.0.1:3000 >"$tunnel_log" 2>&1 &
    echo "$!" >"$tunnel_pid_file"

    for _ in $(seq 1 "$TUNNEL_WAIT_SECS"); do
        if (( SECONDS >= deadline )); then
            break 2
        fi
        webhook_base_url="$(awk 'match($0, /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/) {print substr($0, RSTART, RLENGTH); exit}' "$tunnel_log" 2>/dev/null || true)"
        if [[ -n "$webhook_base_url" ]]; then
            if curl_quick "$webhook_base_url/" >/dev/null 2>&1; then
                # Restart so callback URLs use the public origin, not localhost:3000.
                if ! start_local_sidecar "$webhook_base_url"; then
                    cleanup_tunnel
                    exit 0
                fi
                if curl_quick "$webhook_base_url/" >/dev/null 2>&1; then
                    # Outbound posts OK; do NOT claim Cloud→sidecar callbacks work.
                    mark_ready "$webhook_base_url" false
                    exit 0
                fi
                mark_unavailable "trycloudflare URL became unreachable after restarting webhook_server.js with WEBHOOK_BASE_URL=$webhook_base_url"
                cleanup_tunnel
                exit 0
            fi
        fi
        sleep 1
    done

    echo "Tunnel attempt ${attempt} did not yield a reachable trycloudflare URL"
    attempt=$((attempt + 1))
done

cleanup_tunnel
mark_unavailable "trycloudflare quick tunnel did not become reachable within ${TUNNEL_TOTAL_BUDGET_SECS}s / ${TUNNEL_ATTEMPTS} attempts — configure WEBHOOK_PUBLIC_BASE_URL (+ optional CLOUDFLARED_TUNNEL_TOKEN) for stable ingress"
exit 0
