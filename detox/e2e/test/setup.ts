// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

// Number of retry attempts
const MAX_RETRY_ATTEMPTS = 5;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 10000;

// Track if this is the first launch in the current test file
// Reset to true for each test file in case we need a clean install
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

                    // Permissions are pre-configured in CI workflow to avoid slow SpringBoard restarts
                    // Only set permissions when running locally (not in CI)
                    ...(process.env.CI ? {} : {
                        permissions: {
                            notifications: 'YES',
                            camera: 'NO',
                            medialibrary: 'NO',
                            photos: 'NO',
                        },
                    }),
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

            // iOS 26.x: Wait for WebSocket connection to establish and React Native to initialize
            // The app process starts quickly but RN bridge takes time to initialize
            console.info('Waiting for React Native bridge to initialize...');
            await new Promise((resolve) => {
                setTimeout(resolve, 30000);
            });

            return; // Success, exit the function

        } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`❌ App launch failed on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${errorMessage}`);

            // If this is the last attempt, don't wait
            if (attempt < MAX_RETRY_ATTEMPTS) {
                console.warn(`Waiting ${RETRY_DELAY}ms before retrying...`);
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

                // Force a new instance on retry
                if (!isFirstLaunch && attempt > 1) {
                    console.warn('Forcing new instance for next attempt');
                    isFirstLaunch = true;
                }
            }
        }
    }

    // If we get here, all attempts failed
    const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed to launch app after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${finalErrorMessage}`);
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
    await initializeClaudePromptHandler();

    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    await User.apiAdminLogin(siteOneUrl);
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);

    // Reset launch flag for this test file to ensure clean install
    isFirstLaunch = true;

    await launchAppWithRetry();
}, 300000); // Increase timeout to 5 minutes for iOS 26.x

afterAll(async () => {
    // Reset the launch flag so next test file starts fresh
    isFirstLaunch = true;
});
