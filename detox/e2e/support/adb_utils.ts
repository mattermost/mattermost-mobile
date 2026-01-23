// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

import {execSync} from 'child_process';

/**
 * Check if we're running on Android platform
 * Uses environment variable as fallback if device is not initialized
 */
function isAndroid(): boolean {
    try {
        // Try to get platform from device (if initialized)
        if (typeof device !== 'undefined' && device.getPlatform) {
            return device.getPlatform() === 'android';
        }
    } catch {
        // Device not initialized yet, fall back to env var
    }

    // Fall back to environment variable check
    return process.env.IOS !== 'true';
}

/**
 * Clean up ADB reverse port mappings to prevent "Address already in use" errors
 * This is particularly important in CI environments where previous test runs may have crashed
 * iOS: This function safely no-ops on iOS - no side effects
 */
export async function cleanupAdbReversePorts(): Promise<void> {
    // Only run on Android - safe no-op for iOS
    if (!isAndroid()) {
        return;
    }

    try {
        console.info('[ADB Cleanup] Removing all reverse port mappings...');

        // Remove all reverse port mappings
        execSync('adb reverse --remove-all', {
            stdio: 'pipe',
            timeout: 5000,
        });

        console.info('[ADB Cleanup] Successfully cleaned up reverse port mappings');
    } catch (error) {
        // Don't fail if cleanup fails - this is best-effort
        console.warn(`[ADB Cleanup] Warning: Failed to cleanup reverse ports: ${(error as Error).message}`);
    }
}

/**
 * Reset ADB server connection to clear any stale state
 * This can help recover from connection issues in CI
 * iOS: This function safely no-ops on iOS - no side effects
 */
export async function resetAdbServer(): Promise<void> {
    // Only run on Android - safe no-op for iOS
    if (!isAndroid()) {
        return;
    }

    try {
        console.info('[ADB Reset] Restarting ADB server...');

        // Kill and restart ADB server
        execSync('adb kill-server && adb start-server', {
            stdio: 'pipe',
            timeout: 10000,
        });

        // Wait a bit for server to stabilize
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.info('[ADB Reset] Successfully restarted ADB server');
    } catch (error) {
        // Don't fail if reset fails - this is best-effort
        console.warn(`[ADB Reset] Warning: Failed to reset ADB server: ${(error as Error).message}`);
    }
}
