// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

// Configure jest retries if specified
const retries = process.env.DETOX_RETRIES ? parseInt(process.env.DETOX_RETRIES, 10) : 0;
if (retries > 0) {
    jest.retryTimes(retries);
}

// Number of retry attempts
const MAX_RETRY_ATTEMPTS = 2;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 3000;

/**
 * Launch the app with proper configuration for stable tests
 * @returns {Promise<void>}
 */
export async function launchApp(): Promise<void> {
    try {
        await device.launchApp({
            newInstance: true,
            delete: false,
            permissions: {
                notifications: 'YES',
                camera: 'NO',
                medialibrary: 'NO',
                photos: 'NO',
            },
            launchArgs: {
                detoxPrintBusyIdleResources: 'YES',
                detoxURLBlacklistRegex: '(.*localhost.*|.*127\\.0\\.0\\.1.*)',
                reduceMotion: 'YES',
            },
        });

        console.info('✅ App launched successfully');
    } catch (error) {
        console.error('❌ App launch error:', error);
        throw error;
    }
}

/**
 * Launch the app with retry mechanism for initial setup
 * @returns {Promise<void>}
 */
export async function launchAppWithRetry(): Promise<void> {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
            await launchApp();
            return; // Success, exit the function
        } catch (error) {
            lastError = error;
            console.warn(`❌ App launch failed on attempt ${attempt}/${MAX_RETRY_ATTEMPTS}: ${(error as Error).message}`);

            // If this is the last attempt, don't wait
            if (attempt < MAX_RETRY_ATTEMPTS) {
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
    await initializeClaudePromptHandler();

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
