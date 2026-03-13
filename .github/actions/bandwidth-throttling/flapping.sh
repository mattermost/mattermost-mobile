#!/bin/bash
# Flapping Network Simulation Script
# Simulates intermittent connectivity by cycling through network states
#
# Usage: ./flapping.sh <test_server_host>
# Example: ./flapping.sh mobile-e2e-site-1.test.mattermost.cloud

set -e

# TEST_SERVER_HOST is kept for logging/diagnostic purposes only
TEST_SERVER_HOST="${1:-unspecified}"

echo "Starting flapping network simulation for host: $TEST_SERVER_HOST"
echo "PID: $$"

# Cleanup function to reset network on exit
cleanup() {
    echo "[$(date '+%H:%M:%S')] Cleaning up dnctl pipes..."
    sudo dnctl -q pipe flush 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT EXIT

# Function to apply network settings
apply_settings() {
    local download=$1
    local upload=$2
    local latency=$3
    local packet_loss=$4
    local state_name=$5
    
    echo "[$(date '+%H:%M:%S')] Switching to state: $state_name"
    
    # Reset pipes
    sudo dnctl -q pipe flush 2>/dev/null || true
    
    if [ "$state_name" = "disconnected" ]; then
        # 100% packet loss = disconnected
        sudo dnctl pipe 1 config bw 1Kbit/s plr 1.0
        sudo dnctl pipe 2 config bw 1Kbit/s plr 1.0
    else
        # Configure with specified settings
        DOWNLOAD_OPTS="bw ${download}Kbit/s delay ${latency}ms"
        UPLOAD_OPTS="bw ${upload}Kbit/s delay ${latency}ms"
        
        if [ "$packet_loss" != "0" ]; then
            PLR=$(echo "scale=4; $packet_loss / 100" | bc)
            DOWNLOAD_OPTS="$DOWNLOAD_OPTS plr $PLR"
            UPLOAD_OPTS="$UPLOAD_OPTS plr $PLR"
        fi
        
        sudo dnctl pipe 1 config $DOWNLOAD_OPTS
        sudo dnctl pipe 2 config $UPLOAD_OPTS
    fi
}

# Flapping pattern loop
# Pattern: connected(30s) -> disconnected(5s) -> slow_3g(30s) -> disconnected(3s) -> repeat
cycle=0
while true; do
    cycle=$((cycle + 1))
    echo "[$(date '+%H:%M:%S')] === Flapping cycle $cycle ==="
    
    # State 1: Connected (good connection)
    apply_settings 1000 256 200 0 "connected"
    sleep 30
    
    # State 2: Disconnected
    apply_settings 0 0 0 100 "disconnected"
    sleep 5
    
    # State 3: Slow 3G
    apply_settings 400 128 300 2 "slow_3g"
    sleep 30
    
    # State 4: Brief disconnection
    apply_settings 0 0 0 100 "disconnected"
    sleep 3
    
    # Back to connected for next cycle
done
