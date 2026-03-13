// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {Plugin, System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {timeouts} from '@support/utils';

// Number of retry attempts
const MAX_RETRY_ATTEMPTS = 2;

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
 * Ensure the app is on the server screen before each test file runs.
 *
 * Each test file's beforeAll calls ServerScreen.connectToServer(), which requires
 * server.screen to be visible. This function detects and recovers from three states:
 *
 * 1. server.screen  — clean state after successful logout; proceed immediately.
 * 2. channel_list.screen — previous test's HomeScreen.logout() failed silently;
 *    force a cleanup logout so the server is removed and server.screen appears.
 * 3. server_list.screen — inactive servers remain from a prior test (e.g.
 *    server_login.e2e.ts logs out Server 2 but keeps it in the list); tap
 *    "Add a server" to open server.screen so the next beforeAll can connect.
 *
 * Also acts as the app-readiness check (polls until a known screen appears).
 */
async function ensureOnServerScreen(maxWaitMs = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        // 1. Server screen — clean state, proceed
        try {
            await waitFor(element(by.id('server.screen'))).toBeVisible().withTimeout(2000);
            console.info('✅ App is on server screen');
            return;
        } catch { /* not on server screen yet */ }

        // 2. Channel list — previous test left app logged in; force logout
        try {
            await waitFor(element(by.id('channel_list.screen'))).toBeVisible().withTimeout(2000);
            console.info('ℹ️ App still logged in from previous test — forcing cleanup logout');
            await element(by.id('tab_bar.account.tab')).tap();
            await waitFor(element(by.id('account.screen'))).toExist().withTimeout(timeouts.TEN_SEC);
            await element(by.id('account.logout.option')).tap();
            if (device.getPlatform() === 'android') {
                await element(by.text('LOG OUT')).tap();
            } else {
                await element(by.label('Log out')).atIndex(1).tap();
            }
            await waitFor(element(by.id('account.screen'))).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
            continue;
        } catch { /* not on channel list */ }

        // 3. Server list — inactive servers remain (e.g. Server 2 from server_login.e2e.ts);
        //    open the add-server screen so the next test's beforeAll can connect normally.
        try {
            await waitFor(element(by.id('server_list.screen'))).toBeVisible().withTimeout(2000);
            console.info('ℹ️ App is on server list — opening add-server screen');
            await element(by.text('Add a server')).tap();
            await waitFor(element(by.id('server.screen'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            console.info('✅ Add-server screen is open');
            return;
        } catch { /* not on server list */ }

        // App not yet in a known state — wait and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`App did not reach server screen within ${maxWaitMs}ms`);
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
                // For subsequent launches, restart the process without reinstalling.
                // newInstance: true kills and restarts the process (~5s) so in-memory
                // state is cleared. The app reads WatermelonDB on startup; after a
                // successful logout the DB has no servers, so it shows server.screen.
                // ensureOnServerScreen() below handles any remaining edge cases.
                await device.launchApp({
                    newInstance: true,
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
    // Only do a full clean install (delete: true) for the very first test file per run.
    // process.env persists across Jest test files in the same worker (maxWorkers: 1 in CI),
    // so subsequent files use fast relaunch (~5s) instead of a full reinstall (~85s on iOS).
    isFirstLaunch = !process.env.DETOX_APP_INSTALLED;
    if (isFirstLaunch) {
        process.env.DETOX_APP_INSTALLED = 'true';
    }
    await launchAppWithRetry();

    // Verify Detox connection is healthy after app launch
    await verifyDetoxConnection();

    // Ensure the app is on the server screen before this test file's beforeAll runs.
    // Handles: logged-in state from a previous test, server list with inactive servers,
    // and general app readiness (polls until a known screen appears).
    await ensureOnServerScreen();
    await initializeClaudePromptHandler();

    // Login as sysadmin and reset server configuration
    await System.apiCheckSystemHealth(siteOneUrl);
    const {error: loginError} = await User.apiAdminLogin(siteOneUrl);
    if (loginError) {
        throw new Error(`Admin login failed: ${JSON.stringify(loginError)}`);
    }
    await Plugin.apiDisableNonPrepackagedPlugins(siteOneUrl);
});
