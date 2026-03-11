// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Network degradation profiles for DDIL testing.
 * These match the profiles defined in .github/actions/bandwidth-throttling/profiles.yml
 */

export type NetworkProfile = 'lte' | 'slow_3g' | 'edge_2g' | 'satellite' | 'flapping' | 'custom';

export interface NetworkProfileConfig {
    name: NetworkProfile;
    description: string;
    downloadKbps: number;
    uploadKbps: number;
    latencyMs: number;
    packetLossPercent: number;
    timeoutMultiplier: number;
}

export const NETWORK_PROFILES: Record<NetworkProfile, NetworkProfileConfig> = {
    lte: {
        name: 'lte',
        description: 'Good LTE/4G connection - baseline for comparison',
        downloadKbps: 10000,
        uploadKbps: 5000,
        latencyMs: 30,
        packetLossPercent: 0,
        timeoutMultiplier: 1,
    },
    slow_3g: {
        name: 'slow_3g',
        description: 'Slow 3G - rural or congested network',
        downloadKbps: 400,
        uploadKbps: 128,
        latencyMs: 300,
        packetLossPercent: 2,
        timeoutMultiplier: 3,
    },
    edge_2g: {
        name: 'edge_2g',
        description: 'Edge/2G - minimal cellular connectivity',
        downloadKbps: 50,
        uploadKbps: 25,
        latencyMs: 500,
        packetLossPercent: 5,
        timeoutMultiplier: 10,
    },
    satellite: {
        name: 'satellite',
        description: 'GEO Satellite - high latency connection',
        downloadKbps: 1000,
        uploadKbps: 256,
        latencyMs: 700,
        packetLossPercent: 1,
        timeoutMultiplier: 5,
    },
    flapping: {
        name: 'flapping',
        description: 'Intermittent connectivity - connection drops and recovers',
        downloadKbps: 1000,
        uploadKbps: 256,
        latencyMs: 200,
        packetLossPercent: 0,
        timeoutMultiplier: 5,
    },
    custom: {
        name: 'custom',
        description: 'Custom profile with manual settings',
        downloadKbps: 3300,
        uploadKbps: 3300,
        latencyMs: 500,
        packetLossPercent: 0,
        timeoutMultiplier: 1,
    },
};

/**
 * Get the current network profile from environment variables.
 * Falls back to 'lte' (baseline) if not set.
 */
export function getCurrentNetworkProfile(): NetworkProfile {
    const envProfile = process.env.NETWORK_PROFILE as NetworkProfile;
    if (envProfile && NETWORK_PROFILES[envProfile]) {
        return envProfile;
    }

    // Backward compatibility with LOW_BANDWIDTH_MODE
    if (process.env.LOW_BANDWIDTH_MODE === 'true') {
        return 'slow_3g';
    }

    return 'lte';
}

/**
 * Get the timeout multiplier for the current network profile.
 * Use this to scale test timeouts based on network conditions.
 */
export function getTimeoutMultiplier(): number {
    const profile = getCurrentNetworkProfile();
    return NETWORK_PROFILES[profile].timeoutMultiplier;
}

/**
 * Get the full configuration for the current network profile.
 */
export function getCurrentNetworkConfig(): NetworkProfileConfig {
    const profile = getCurrentNetworkProfile();
    return NETWORK_PROFILES[profile];
}

/**
 * Check if we're running under degraded network conditions.
 */
export function isDegradedNetwork(): boolean {
    const profile = getCurrentNetworkProfile();
    return profile !== 'lte';
}

/**
 * Check if we're running under severely degraded network conditions.
 * This is useful for skipping tests that are not meaningful under extreme degradation.
 */
export function isSeverelyDegradedNetwork(): boolean {
    const profile = getCurrentNetworkProfile();
    return profile === 'edge_2g' || profile === 'flapping';
}

/**
 * Get a formatted string with current network profile information.
 * Useful at the start of test runs for debugging.
 */
export function getNetworkProfileInfo(): string {
    const config = getCurrentNetworkConfig();
    return [
        '=== Network Profile ===',
        `Profile: ${config.name}`,
        `Description: ${config.description}`,
        `Download: ${config.downloadKbps} Kbps`,
        `Upload: ${config.uploadKbps} Kbps`,
        `Latency: ${config.latencyMs} ms`,
        `Packet Loss: ${config.packetLossPercent}%`,
        `Timeout Multiplier: ${config.timeoutMultiplier}x`,
        '=======================',
    ].join('\n');
}
