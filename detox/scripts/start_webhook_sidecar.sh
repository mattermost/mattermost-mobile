#!/bin/bash
# Start the Detox mm_blocks webhook sidecar with a *public* base URL.
#
# Mattermost cloud must call back into the runner. trycloudflare.com quick tunnels
# are the historical default and are DNS-flaky (CI 30250131265 iOS machine-11:
# cloudflared binary downloaded fine, then ~8m of unbounded curl DNS → exit 6,
# Metro never started). Prefer a stable ingress when CI provides one.
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
# Hard wall-clock budget for the whole trycloudflare path (CI 30250131265 hung ~8m).
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
    # passes curl health but Mattermost→tunnel callbacks hang (CI 59ec6ae).
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
    echo "::warning::Webhook sidecar unavailable — mm_blocks specs on this shard will fail their health check. ${reason}"
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

    local download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/${cloudflared_asset}"
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
    cd "$detox_dir"
    : >"$webhook_log"
    nohup env SITE_URL="$SITE_1_URL" \
        ADMIN_USERNAME="${ADMIN_USERNAME:-}" \
        ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
        WEBHOOK_BASE_URL="$public_base_url" \
        node webhook_server.js >"$webhook_log" 2>&1 &
    echo "$!" >"$pid_file"

    local local_ok=0
    for _ in $(seq 1 30); do
        if curl_quick http://127.0.0.1:3000/ >/dev/null 2>&1; then
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
        nohup "$cloudflared" tunnel --no-autoupdate run --token "$CLOUDFLARED_TUNNEL_TOKEN" >"$tunnel_log" 2>&1 &
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
