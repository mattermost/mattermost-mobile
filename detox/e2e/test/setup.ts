// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {cleanupAdbReversePorts, resetAdbServer} from '@support/adb_utils';
import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

// Number of retry attempts
const MAX_RETRY_ATTEMPTS = 3;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 5000;

let isFirstLaunch = true;

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
            return; // Success, exit the function

        } catch (error) {
            lastError = error;
            console.warn(`❌ App launch failed on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${(error as Error).message}`);

            // If this is the last attempt, don't wait
            if (attempt < MAX_RETRY_ATTEMPTS) {
                // Check if this is an ADB port binding issue (Android-specific, common in CI)
                const errorMessage = (error as Error).message;
                const isAdbPortError = errorMessage.includes('cannot bind listener') ||
                                      errorMessage.includes('Address already in use') ||
                                      errorMessage.includes('adb');

                // Only attempt ADB cleanup if we detect an ADB-related error
                // These functions are safe no-ops on iOS
                if (isAdbPortError) {
                    console.warn('Detected ADB-related error, attempting cleanup...');
                    await cleanupAdbReversePorts();

                    // On second retry with port issues, also reset ADB server
                    if (attempt >= 2) {
                        console.warn('Multiple failures detected, attempting ADB server reset...');
                        await resetAdbServer();
                    }
                }

                console.warn(`Waiting ${RETRY_DELAY}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    // If we get here, all attempts failed
    throw new Error(`Failed to launch app after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${(lastError as Error).message}`);
}

/**
 * Initialize ClaudePromptHandler if ANTHROPIC_API_KEY is set
 * @returns {Promise<void>}
 */
async function initializeClaudePromptHandler(): Promise<void> {
    if (process.env.ANTHROPIC_API_KEY) {
        const promptHandler = new ClaudePromptHandler(process.env.ANTHROPIC_API_KEY);
        pilot.init(promptHandler);
    } else {
        console.info('To use ClaudePromptHandler, please set the ANTHROPIC_API_KEY environment variable.');
    }
}

beforeAll(async () => {
    // Reset flag to ensure each test file starts with a clean app launch
    isFirstLaunch = true;

    await initializeClaudePromptHandler();

    // Clean up any stale ADB reverse port mappings from previous runs
    // This is crucial in CI where crashed tests may leave stale connections
    await cleanupAdbReversePorts();

    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    await User.apiAdminLogin(siteOneUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);
    await launchAppWithRetry();
});

// Add this to speed up test cleanup
afterAll(async () => {
    try {
        await device.terminateApp();
    } catch (error) {
        console.error('[Teardown] Error terminating app:', error);
    }

    // Clean up ADB connections after tests complete
    try {
        await cleanupAdbReversePorts();
    } catch (error) {
        console.error('[Teardown] Error cleaning up ADB ports:', error);
    }
});
