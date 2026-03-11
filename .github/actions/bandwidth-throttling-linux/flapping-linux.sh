#!/bin/bash
# Flapping Network Simulation Script for Linux (tc/netem)
# Simulates intermittent connectivity by cycling through network states

set -e

echo "Starting flapping network simulation (Linux)"
echo "PID: $$"

# Function to apply network settings using tc/netem
apply_settings() {
    local download=$1
    local latency=$2
    local packet_loss=$3
    local state_name=$4
    
    echo "[$(date '+%H:%M:%S')] Switching to state: $state_name"
    
    # Remove existing rules
    sudo tc qdisc del dev eth0 root 2>/dev/null || true
    
    if [ "$state_name" = "disconnected" ]; then
        # 100% packet loss = disconnected
        sudo tc qdisc add dev eth0 root netem loss 100%
    else
        # Build netem options
        NETEM_OPTS="delay ${latency}ms"
        if [ "$packet_loss" != "0" ]; then
            NETEM_OPTS="$NETEM_OPTS loss ${packet_loss}%"
        fi
        
        # Add netem for delay/loss
        sudo tc qdisc add dev eth0 root handle 1: netem $NETEM_OPTS
        
        # Add rate limiting
        RATE="${download}kbit"
        BURST="$((download / 8))kb"
        sudo tc qdisc add dev eth0 parent 1: handle 2: tbf rate $RATE burst $BURST latency 50ms
    fi
}

# Flapping pattern loop
cycle=0
while true; do
    cycle=$((cycle + 1))
    echo "[$(date '+%H:%M:%S')] === Flapping cycle $cycle ==="
    
    # State 1: Connected (good connection)
    apply_settings 1000 200 0 "connected"
    sleep 30
    
    # State 2: Disconnected
    apply_settings 0 0 100 "disconnected"
    sleep 5
    
    # State 3: Slow 3G
    apply_settings 400 300 2 "slow_3g"
    sleep 30
    
    # State 4: Brief disconnection
    apply_settings 0 0 100 "disconnected"
    sleep 3
done
