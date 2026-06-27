// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {execSync} from 'child_process';
import {existsSync} from 'fs';

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

const BUNDLE_ID = 'com.mattermost.rnbeta';

function getSimulatorId(): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const udid = (device as any)._deviceId || (device as any).id || process.env.SIMULATOR_ID || '';
        return typeof udid === 'string' ? udid : '';
    } catch {
        return process.env.SIMULATOR_ID || '';
    }
}

let cachedDataContainer: string | undefined;
let cachedAppGroupContainer: string | undefined;

function resolveContainerPath(simId: string, kind: string): string | undefined {
    try {
        const path = execSync(
            `xcrun simctl get_app_container "${simId}" ${BUNDLE_ID} ${kind} 2>/dev/null`,
            {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']},
        ).trim();
        return path || undefined;
    } catch {
        return undefined;
    }
}

function clearIOSAppData(): void {
    const simId = getSimulatorId();
    if (!simId) {
        console.warn('[clearIOSAppData] No simulator ID — skipping data wipe');
        return;
    }

    try {
        const appPid = execSync(
            `xcrun simctl spawn "${simId}" launchctl list 2>/dev/null | grep "${BUNDLE_ID}" | awk '{print $1}' | grep -E '^[0-9]+$' || true`,
            {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']},
        ).trim();

        if (appPid) {
            execSync(`xcrun simctl spawn "${simId}" kill -9 "${appPid}"`, {stdio: 'pipe'});

            execSync('sleep 1', {stdio: 'pipe'});
        }
    } catch {
        // App might not be running — that's fine
    }

    // 2. Find the app's data container and delete its contents.
    if (!cachedDataContainer) {
        cachedDataContainer = resolveContainerPath(simId, 'data');
    }
    if (cachedDataContainer) {
        try {
            // Remove all contents of Documents, Library, tmp (but keep the container dir)
            execSync(`find "${cachedDataContainer}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`, {stdio: 'pipe'});
            console.info(`[clearIOSAppData] Cleared data container: ${cachedDataContainer}`);
        } catch {
            console.warn('[clearIOSAppData] data-container wipe failed');
        }
    } else {
        console.warn('[clearIOSAppData] Could not resolve data container (app may not be installed yet)');
    }

    if (!cachedAppGroupContainer) {
        cachedAppGroupContainer = resolveContainerPath(simId, 'group.com.mattermost.rnbeta');
    }
    if (cachedAppGroupContainer) {
        if (existsSync(cachedAppGroupContainer)) {
            try {
                execSync(`find "${cachedAppGroupContainer}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`, {stdio: 'pipe'});
                console.info(`[clearIOSAppData] Cleared App Group container: ${cachedAppGroupContainer}`);
            } catch {
                console.warn('[clearIOSAppData] App-Group-container wipe failed');
            }
        }
    } else {
        console.warn('[clearIOSAppData] Could not resolve App Group container');
    }

    // 3. Clear the keychain (removes stored auth tokens, certificates)
    try {
        execSync(`xcrun simctl keychain "${simId}" reset`, {stdio: 'pipe'});
    } catch {
        // Older simctl versions may not support keychain reset — non-fatal
    }
}

// ─── Admin API login ─────────────────────────────────────────────────────────

async function loginAdmin(): Promise<void> {
    const HEALTH_MAX_ATTEMPTS = 5;
    for (let healthAttempt = 1; healthAttempt <= HEALTH_MAX_ATTEMPTS; healthAttempt++) {
        try {
            await System.apiCheckSystemHealth(siteOneUrl);
            break;
        } catch (error) {
            if (healthAttempt === HEALTH_MAX_ATTEMPTS) {
                throw error;
            }
            console.warn(`⚠️ System health check attempt ${healthAttempt} failed, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 3000 * healthAttempt));
        }
    }

    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const {error: loginError} = await User.apiAdminLogin(siteOneUrl);
        if (loginError) {
            if (attempt === MAX_ATTEMPTS) {
                throw new Error(`Admin login failed after ${MAX_ATTEMPTS} attempts: ${JSON.stringify(loginError)}`);
            }
            console.warn(`⚠️ Admin login attempt ${attempt} failed, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            continue;
        }

        const {error: meError} = await User.apiGetMe(siteOneUrl);
        if (!meError) {
            console.info(`✅ Admin session verified on attempt ${attempt}`);
            return;
        }
        if (attempt === MAX_ATTEMPTS) {
            throw new Error(`Admin session not usable after ${MAX_ATTEMPTS} login attempts`);
        }
        console.warn(`⚠️ Session check failed on attempt ${attempt}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
}

// Android 13+ (API 33+): the `permissions` key in device.launchApp() only works
// on iOS simulators. On Android, notification permission must be granted via adb.
async function grantAndroidNotificationPermission(): Promise<void> {
    if (device.getPlatform() !== 'android') {
        return;
    }
    try {
        execSync(`adb shell pm grant ${BUNDLE_ID} android.permission.POST_NOTIFICATIONS`, {stdio: 'pipe'});
    } catch {
        // API < 33 or already granted
    }
}

// ─── Global beforeAll ────────────────────────────────────────────────────────
// Runs before each test file.
// Responsibilities: launch app with clean state, admin login, plugin cleanup.

beforeAll(async () => {
    if (device.getPlatform() === 'android') {
        try {
            execSync(`adb shell am force-stop ${BUNDLE_ID}`, {stdio: 'pipe'});
        } catch { /* app may not be running */ }
        try {
            execSync(`adb shell pm clear ${BUNDLE_ID}`, {stdio: 'pipe'});
        } catch {
            // Package might not be installed yet on first run
        }

        try {
            execSync('adb shell settings put secure show_ime_with_hard_keyboard 0', {stdio: 'pipe'});
            execSync('adb shell settings put secure spell_checker_enabled 0', {stdio: 'pipe'});
            execSync('adb shell settings put secure auto_text_enabled 0', {stdio: 'pipe'});
        } catch {
            // Older AVDs may not support these — non-fatal.
        }
    }

    const isFirstFile = !process.env.DETOX_SETUP_DONE;
    const launchArgs = {detoxDisableSynchronization: 'YES'};

    const APP_READY_TIMEOUT = device.getPlatform() === 'android' ? 90_000 : 30_000;

    async function forceAndroidDataClear(): Promise<void> {
        if (device.getPlatform() !== 'android') {
            return;
        }
        try {
            // Stop the app process first so pm clear can safely wipe its data dir.
            execSync(`adb shell am force-stop ${BUNDLE_ID}`, {stdio: 'pipe'});
        } catch { /* app may not be running */ }
        try {
            execSync(`adb shell pm clear ${BUNDLE_ID}`, {stdio: 'pipe'});
            console.info('[forceAndroidDataClear] pm clear succeeded');
        } catch (e) {
            console.warn('[forceAndroidDataClear] pm clear failed:', String(e).slice(0, 200));
        }
    }

    async function ensureAndroidMetroReverse(): Promise<void> {
        if (device.getPlatform() !== 'android') {
            return;
        }
        try {
            execSync('adb reverse tcp:8081 tcp:8081', {stdio: 'pipe'});
            const reverseList = execSync('adb reverse --list', {encoding: 'utf8'});
            if (!reverseList.includes('tcp:8081')) {
                console.warn('[ensureAndroidMetroReverse] tcp:8081 reverse missing after setup');
            }
        } catch (e) {
            console.warn('[ensureAndroidMetroReverse] failed:', String(e).slice(0, 200));
        }
    }

    async function launchAndVerify(): Promise<void> {
        await grantAndroidNotificationPermission();
        await ensureAndroidMetroReverse();

        await device.launchApp({
            newInstance: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
            launchArgs,
        });

        await device.disableSynchronization();

        const serverScreenEl = element(by.id('server.screen'));

        try {
            await waitFor(serverScreenEl).toExist().withTimeout(APP_READY_TIMEOUT);
        } catch {
            if (device.getPlatform() === 'android') {
                const channelListEl = element(by.id('channel_list.screen'));
                try {
                    await waitFor(channelListEl).toExist().withTimeout(5_000);
                    console.warn(
                        '[launchAndVerify] App launched in logged-in state (channel_list visible). ' +
                        'pm clear did not take effect. Retrying with force-stop + pm clear.',
                    );
                    await forceAndroidDataClear();

                    await grantAndroidNotificationPermission();
                    await ensureAndroidMetroReverse();
                    await device.launchApp({newInstance: true, launchArgs});
                    await waitFor(serverScreenEl).toExist().withTimeout(APP_READY_TIMEOUT);
                } catch {
                    throw new Error(
                        `[launchAndVerify] Neither server.screen nor channel_list.screen appeared within ${APP_READY_TIMEOUT / 1000}s`,
                    );
                }
            } else {
                const channelListEl = element(by.id('channel_list.screen'));
                try {
                    await waitFor(channelListEl).toExist().withTimeout(5_000);
                    console.warn(
                        '[launchAndVerify] iOS app launched with stale state (channel_list visible). ' +
                        'clearIOSAppData wipe incomplete. Re-clearing and relaunching.',
                    );
                    clearIOSAppData();
                    await device.launchApp({
                        newInstance: true,
                        ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
                        launchArgs,
                    });
                    await waitFor(serverScreenEl).toExist().withTimeout(APP_READY_TIMEOUT);
                } catch {
                    throw new Error(
                        `[launchAndVerify] server.screen did not appear within ${APP_READY_TIMEOUT / 1000}s`,
                    );
                }
            }
        } finally {
            // Always re-enable synchronization so subsequent test operations
            // (tap, typeText, expect) re-enter the normal synchronized path.
            await device.enableSynchronization();
        }
    }

    if (isFirstFile) {
        process.env.DETOX_SETUP_DONE = 'true';
    }

    if (device.getPlatform() === 'ios') {
        clearIOSAppData();
    }

    const MAX_LAUNCH_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_LAUNCH_ATTEMPTS; attempt++) {
        try {
            await launchAndVerify();
            break;
        } catch (launchError) {
            console.warn(
                `⚠️ Launch attempt ${attempt}/${MAX_LAUNCH_ATTEMPTS} failed:`,
                String(launchError).slice(0, 300),
            );
            if (attempt === MAX_LAUNCH_ATTEMPTS) {
                throw launchError;
            }

            if (device.getPlatform() === 'ios') {
                clearIOSAppData();
            } else if (device.getPlatform() === 'android') {
                await forceAndroidDataClear();
                await ensureAndroidMetroReverse();
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }

    console.info('✅ App launched');

    // Initialize Claude AI prompt handler if available
    try {
        if (process.env.ANTHROPIC_API_KEY) {
            pilot.init(new ClaudePromptHandler(process.env.ANTHROPIC_API_KEY));
        }
    } catch (e) {
        console.warn('Claude init failed:', e);
    }

    await loginAdmin();
}, 360_000);
