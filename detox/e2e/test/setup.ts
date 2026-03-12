// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

// Number of retry attempts
const MAX_RETRY_ATTEMPTS = 3;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 5000;

let isFirstLaunch = true;

/**
 * Verify Detox connection to app is healthy
 * @param maxAttempts - Maximum number of verification attempts
 * @param delayMs - Delay between attempts in milliseconds
 * @returns {Promise<void>}
 */
async function verifyDetoxConnection(maxAttempts = 3, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Simple health check: verify device is responsive
            device.getPlatform();
            console.info(`✅ Detox connection verified on attempt ${attempt}`);
            return;
        } catch (error) {
            console.warn(`❌ Detox connection check failed on attempt ${attempt}/${maxAttempts}: ${(error as Error).message}`);

            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * attempt)); // Exponential backoff
            }
        }
    }

    throw new Error('Detox connection verification failed after maximum attempts');
}

/**
 * Wait for app to be ready (database initialized, bridge ready)
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns {Promise<void>}
 */
async function waitForAppReady(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            // Check if app is responsive by looking for a basic UI element
            // Try server screen first, then channel list screen
            try {
                await waitFor(element(by.id('server.screen'))).toBeVisible().withTimeout(2000);
            } catch {
                await waitFor(element(by.id('channel_list.screen'))).toBeVisible().withTimeout(2000);
            }
            console.info('✅ App is ready');
            return;
        } catch {
            // App not ready yet, wait a bit
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    throw new Error(`App failed to become ready within ${timeoutMs}ms`);
}

/**
 * Dismiss React Native RedBox error overlay if visible in debug builds.
 * Native errors (e.g. RCTImageView event re-registration) are thrown before
 * JS runs and cannot be suppressed via LogBox — dismiss them here instead.
 */
async function dismissRedBoxIfVisible(): Promise<void> {
    if (device.getPlatform() !== 'ios') {
        return;
    }
    try {
        // Prefer "Reload" to reconnect to Metro rather than "Dismiss" which leaves app with no bundle
        await waitFor(element(by.text('Reload'))).toBeVisible().withTimeout(2000);
        await element(by.text('Reload')).tap();
        console.info('ℹ️ Tapped Reload on native RedBox to reconnect to Metro');

        // Give Metro time to serve the bundle
        await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch {
        // No RedBox visible, continue normally
    }
}

/**
 * Launch the app with retry mechanism
 * @returns {Promise<void>}
 */
export async function launchAppWithRetry(): Promise<void> {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
            if (isFirstLaunch) {
                // For first launch, clean install
                await device.launchApp({
                    newInstance: true,
                    delete: true,
                    permissions: {
                        notifications: 'YES',
                        camera: 'NO',
                        medialibrary: 'NO',
                        photos: 'NO',
                    },
                    launchArgs: {
                        detoxPrintBusyIdleResources: 'YES',
                        detoxDebugVisibility: 'YES',
                        detoxDisableSynchronization: 'YES',
                        detoxDisableHierarchyDump: 'YES',
                        reduceMotion: 'YES',
                    },
                });
                isFirstLaunch = false;
            } else {
                // For subsequent launches, reuse instance
                await device.launchApp({
                    newInstance: false,
                    launchArgs: {
                        detoxPrintBusyIdleResources: 'YES',
                        detoxDebugVisibility: 'YES',
                        detoxDisableSynchronization: 'YES',
                        detoxURLBlacklistRegex: '.*localhost.*',
                    },
                });
            }

            console.info(`✅ App launched successfully on attempt ${attempt}`);

            // Dismiss any native RedBox error overlay that may appear in debug builds
            // (e.g. 'RCTImageView re-registered bubbling event' warning on iOS)
            await dismissRedBoxIfVisible();
            return;

        } catch (error) {
            lastError = error;
            console.warn(`❌ App launch failed on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${(error as Error).message}`);

            if (attempt < MAX_RETRY_ATTEMPTS) {
                console.warn(`Waiting ${RETRY_DELAY}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    throw new Error(`Failed to launch app after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${(lastError as Error).message}`);
}

/**
 * Initialize ClaudePromptHandler if ANTHROPIC_API_KEY is set
 * @returns {Promise<void>}
 */
async function initializeClaudePromptHandler(): Promise<void> {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            return;
        }
        const promptHandler = new ClaudePromptHandler(process.env.ANTHROPIC_API_KEY);
        pilot.init(promptHandler);
    } catch (e) {
        console.warn('Claude init failed, continuing without AI:', e);
    }
}

beforeAll(async () => {
    // Reset flag to ensure each test file starts with a clean app launch
    isFirstLaunch = true;
    await launchAppWithRetry();

    // Verify Detox connection is healthy after app launch
    await verifyDetoxConnection();

    // Wait for app to be fully ready (database initialized, bridge ready)
    await waitForAppReady();
    await initializeClaudePromptHandler();

    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    const {error: loginError} = await User.apiAdminLogin(siteOneUrl);
    if (loginError) {
        throw new Error(`Admin login failed: ${JSON.stringify(loginError)}`);
    }
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);
});
