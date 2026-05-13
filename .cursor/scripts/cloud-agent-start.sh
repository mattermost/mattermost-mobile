#!/usr/bin/env bash
# Cursor Cloud Agent start script for mattermost-mobile.
# - Materializes the cloud-only AGENTS.md.
# - Relaxes AppArmor user-namespace restriction (some emulator/container workloads need it).
# - Starts adb server so Mobile MCP can reach the emulator immediately.
# - Optionally starts dockerd (off by default — mattermost-mobile points at an external Mattermost server).

set -Eeuo pipefail

log() { printf '[cloud-agent-start] %s\n' "$*" >&2; }

is_true() {
  case "${1:-}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

ensure_docker_socket_access() {
  [ -S /var/run/docker.sock ] || return 0
  sudo groupadd -f docker
  sudo usermod -aG docker "$(id -un)"
  sudo chgrp docker /var/run/docker.sock >/dev/null 2>&1 || true
  sudo chmod g+rw /var/run/docker.sock >/dev/null 2>&1 || true
  if command -v setfacl >/dev/null 2>&1; then
    sudo setfacl -m "u:$(id -un):rw" /var/run/docker.sock >/dev/null 2>&1 || true
  fi
}

start_docker_daemon() {
  if ! command -v docker >/dev/null 2>&1; then
    log "docker CLI missing; skipping dockerd startup"
    return 0
  fi

  ensure_docker_socket_access
  if docker info >/dev/null 2>&1; then
    log "Docker is already running"
    return 0
  fi

  log "Starting Docker daemon"
  if command -v service >/dev/null 2>&1; then
    sudo sh -c 'service docker start >/tmp/docker-service-start.log 2>&1' || \
      log "service docker start failed; falling back to direct dockerd"
  fi
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo sh -c 'nohup dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &'
  fi

  for _ in {1..60}; do
    ensure_docker_socket_access
    if docker info >/dev/null 2>&1; then
      log "Docker is ready"
      return 0
    fi
    sleep 1
  done

  log "Docker did not become ready within 60 seconds"
  [ -f /tmp/docker-service-start.log ] && { log "service output:"; tail -n 80 /tmp/docker-service-start.log >&2 || true; }
  [ -f /tmp/dockerd.log ] && { log "dockerd output:"; tail -n 120 /tmp/dockerd.log >&2 || true; }
  return 1
}

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ -f .cursor/cursor.md ]; then
  cp .cursor/cursor.md .cursor/AGENTS.md
  log "Materialized Cloud Agent instructions at .cursor/AGENTS.md"
fi

if [ -f /proc/sys/kernel/apparmor_restrict_unprivileged_userns ]; then
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 >/dev/null 2>&1 || \
    log "Could not relax AppArmor userns restriction"
fi

export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

if command -v adb >/dev/null 2>&1; then
  adb start-server >/dev/null 2>&1 || log "adb start-server failed; emulator terminal will start it on connect"
fi

if is_true "${CLOUD_AGENT_START_DOCKER:-}"; then
  start_docker_daemon || log "dockerd start failed; continuing without Docker"
else
  log "Skipping dockerd startup (set CLOUD_AGENT_START_DOCKER=1 to enable)"
fi

log "Start complete. Emulator and Metro run in tmux terminals; watch those panes for liveness."
