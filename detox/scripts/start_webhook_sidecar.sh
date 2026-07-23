#!/bin/bash

set -euo pipefail

detox_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cloudflared="${RUNNER_TEMP:-/tmp}/cloudflared"
webhook_log="${RUNNER_TEMP:-/tmp}/mattermost-webhook-sidecar.log"
tunnel_log="${RUNNER_TEMP:-/tmp}/mattermost-webhook-tunnel.log"

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) cloudflared_asset="cloudflared-linux-amd64" ;;
    Darwin-arm64) cloudflared_asset="cloudflared-darwin-arm64.tgz" ;;
    Darwin-x86_64) cloudflared_asset="cloudflared-darwin-amd64.tgz" ;;
    *)
        echo "Unsupported webhook tunnel platform: $(uname -s)-$(uname -m)" >&2
        exit 1
        ;;
esac

if [[ ! -x "$cloudflared" ]]; then
    download_url="https://github.com/cloudflare/cloudflared/releases/latest/download/${cloudflared_asset}"
    if [[ "$cloudflared_asset" == *.tgz ]]; then
        archive="${cloudflared}.tgz"
        curl --fail --location --retry 3 "$download_url" --output "$archive"
        tar -xzf "$archive" -C "$(dirname "$cloudflared")"
    else
        curl --fail --location --retry 3 "$download_url" --output "$cloudflared"
    fi
    chmod +x "$cloudflared"
fi

cd "$detox_dir"
nohup env SITE_URL="${SITE_1_URL:?SITE_1_URL is required}" \
    ADMIN_USERNAME="${ADMIN_USERNAME:-}" \
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
    node webhook_server.js >"$webhook_log" 2>&1 &
echo "$!" >"${RUNNER_TEMP:-/tmp}/mattermost-webhook-sidecar.pid"

for _ in {1..30}; do
    if curl --fail --silent http://127.0.0.1:3000/ >/dev/null; then
        break
    fi
    sleep 1
done
curl --fail --silent http://127.0.0.1:3000/ >/dev/null

nohup "$cloudflared" tunnel --no-autoupdate --url http://127.0.0.1:3000 >"$tunnel_log" 2>&1 &
echo "$!" >"${RUNNER_TEMP:-/tmp}/mattermost-webhook-tunnel.pid"

webhook_base_url=""
for _ in {1..60}; do
    webhook_base_url="$(awk 'match($0, /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/) {print substr($0, RSTART, RLENGTH); exit}' "$tunnel_log")"
    if [[ -n "$webhook_base_url" ]] && curl --fail --silent --retry 3 "$webhook_base_url/" >/dev/null; then
        break
    fi
    sleep 1
done

if [[ -z "$webhook_base_url" ]]; then
    echo "Cloudflare quick tunnel did not publish a URL" >&2
    exit 1
fi

curl --fail --silent --retry 3 "$webhook_base_url/" >/dev/null
echo "WEBHOOK_BASE_URL=$webhook_base_url" >>"${GITHUB_ENV:?GITHUB_ENV is required}"
echo "Webhook sidecar is reachable at $webhook_base_url"
