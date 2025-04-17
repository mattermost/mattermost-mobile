// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

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

            // Verify app is connected by executing a simple command
            await device.reloadReactNative();
            console.info(`✅ App launched successfully on attempt ${attempt}`);
            return; // Success, exit the function

        } catch (error) {
            lastError = error;
            console.warn(`❌ App launch failed on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${(error as Error).message}`);

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
    throw new Error(`Failed to launch app after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${(lastError as Error).message}`);
}

beforeAll(async () => {
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
        console.error('Error terminating app:', error);
    }
});
