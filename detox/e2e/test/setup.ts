// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {execSync} from 'child_process';
import {existsSync} from 'fs';

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {safeEnableSynchronization} from '@support/utils';

const BUNDLE_ID = 'com.mattermost.rnbeta';

function getSimulatorId(): string {
    try {
        // Prefer the Detox-allocated device for this Jest worker. Falling back to
        // process.env.SIMULATOR_ID (always the first pre-booted sim) would wipe
        // the wrong device when DETOX_MAX_WORKERS > 1.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const udid = (device as any)._deviceId || (device as any).id || '';
        if (typeof udid === 'string' && udid.length > 0) {
            return udid;
        }
    } catch {
        // device not ready yet
    }
    return '';
}

/** adb serial for the Detox-allocated emulator (required when EMULATOR_COUNT > 1). */
function getAdbSerial(): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (device as any).id || (device as any)._deviceId || process.env.ANDROID_SERIAL || '';
        return typeof id === 'string' ? id : '';
    } catch {
        return process.env.ANDROID_SERIAL || '';
    }
}

function adb(args: string): string {
    const serial = getAdbSerial();
    const serialFlag = serial ? `-s "${serial}" ` : '';
    return execSync(`adb ${serialFlag}${args}`, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']});
}

// Container paths are per-simulator; key the cache so a worker never reuses
// another device's paths if Detox reallocates (or after a reinstall).
const cachedDataContainerBySim = new Map<string, string>();
const cachedAppGroupContainerBySim = new Map<string, string>();

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
    let dataContainer = cachedDataContainerBySim.get(simId);
    if (!dataContainer) {
        dataContainer = resolveContainerPath(simId, 'data');
        if (dataContainer) {
            cachedDataContainerBySim.set(simId, dataContainer);
        }
    }
    if (dataContainer) {
        try {
            // Remove all contents of Documents, Library, tmp (but keep the container dir)
            execSync(`find "${dataContainer}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`, {stdio: 'pipe'});
            console.info(`[clearIOSAppData] Cleared data container: ${dataContainer}`);
        } catch {
            console.warn('[clearIOSAppData] data-container wipe failed');
        }
    } else {
        console.warn('[clearIOSAppData] Could not resolve data container (app may not be installed yet)');
    }

    let appGroupContainer = cachedAppGroupContainerBySim.get(simId);
    if (!appGroupContainer) {
        appGroupContainer = resolveContainerPath(simId, 'group.com.mattermost.rnbeta');
        if (appGroupContainer) {
            cachedAppGroupContainerBySim.set(simId, appGroupContainer);
        }
    }
    if (appGroupContainer) {
        if (existsSync(appGroupContainer)) {
            try {
                execSync(`find "${appGroupContainer}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`, {stdio: 'pipe'});
                console.info(`[clearIOSAppData] Cleared App Group container: ${appGroupContainer}`);
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
        adb(`shell pm grant ${BUNDLE_ID} android.permission.POST_NOTIFICATIONS`);
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
            adb(`shell am force-stop ${BUNDLE_ID}`);
        } catch { /* app may not be running */ }
        try {
            adb(`shell pm clear ${BUNDLE_ID}`);
        } catch {
            // Package might not be installed yet on first run
        }

        try {
            adb('shell settings put secure show_ime_with_hard_keyboard 0');
            adb('shell settings put secure spell_checker_enabled 0');
            adb('shell settings put secure auto_text_enabled 0');
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
            adb(`shell am force-stop ${BUNDLE_ID}`);
        } catch { /* app may not be running */ }
        try {
            adb(`shell pm clear ${BUNDLE_ID}`);
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
            adb('reverse tcp:8081 tcp:8081');
            const reverseList = adb('reverse --list');
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
            await safeEnableSynchronization();
        }
    }

    if (isFirstFile) {
        process.env.DETOX_SETUP_DONE = 'true';
    }

    // Stagger parallel Jest workers so two launchApp() calls do not race Metro's
    // first iOS/Android bundle compile (seen as "Detox can't seem to connect").
    const jestWorkerId = Number.parseInt(process.env.JEST_WORKER_ID || '1', 10);
    if (Number.isFinite(jestWorkerId) && jestWorkerId > 1) {
        const staggerMs = (jestWorkerId - 1) * 15_000;
        console.info(`[beforeAll] Staggering launch by ${staggerMs}ms (JEST_WORKER_ID=${jestWorkerId})`);
        await new Promise((resolve) => setTimeout(resolve, staggerMs));
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
