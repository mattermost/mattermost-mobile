// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-await-in-loop, no-console */

import {execSync} from 'child_process';

import {ClaudePromptHandler} from '@support/pilot/ClaudePromptHandler';
import {System, User} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

const BUNDLE_ID = 'com.mattermost.rnbeta';

// ─── iOS app state reset ─────────────────────────────────────────────────────
// On iOS, `device.launchApp({ delete: true })` triggers a full uninstall +
// reinstall cycle. This is notoriously fragile on CI — Detox frequently loses
// its WebSocket connection to the app during the reinstall, especially on
// resource-constrained macOS-15 runners (3 cores, 7 GB RAM) with iOS 26.x
// simulators.  The failure mode: `server.screen` never appears within 60 s.
//
// Fix: clear the app's data container via simctl + clear keychain, then
// relaunch with `newInstance: true`.  The app binary stays installed (matching
// the CI pre-boot step), so Detox never drops its connection.

function getSimulatorId(): string {
    // Detox exposes the allocated device UDID via an internal API.
    // Fallback to the CI-provided env var set during pre-boot.
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const udid = (device as any)._deviceId || (device as any).id || process.env.SIMULATOR_ID || '';
        return typeof udid === 'string' ? udid : '';
    } catch {
        return process.env.SIMULATOR_ID || '';
    }
}

// Resolved-once container paths — `xcrun simctl get_app_container` runs an
// IPC into the booted simulator's launchd, which serializes badly when 20
// parallel iOS shards each call it ~6× per shard. Under load it sometimes
// returns an empty string (no error code) and we silently skip the wipe,
// leaving stale App Group databases that cause the "Couldn't load <team>"
// cascade on the next launch. Resolve each path once per process and reuse.
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

    // 1. Kill the app process directly via its PID inside the simulator.
    //    `simctl terminate` and Detox's terminateApp() can both hang on iOS 26.x.
    //    The launchd PID approach is instantaneous and cannot hang.
    try {
        const appPid = execSync(
            `xcrun simctl spawn "${simId}" launchctl list 2>/dev/null | grep "${BUNDLE_ID}" | awk '{print $1}' | grep -E '^[0-9]+$' || true`,
            {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']},
        ).trim();

        if (appPid) {
            execSync(`xcrun simctl spawn "${simId}" kill -9 "${appPid}"`, {stdio: 'pipe'});

            // Wait for the simulator to fully release the process and its file
            // handles. Without this, the data wipe below can race with SQLite
            // WAL/SHM file locks — the app's database files survive partially,
            // causing WatermelonDB to recover stale server entries on next launch
            // while the keychain (auth tokens) is already wiped. This produces
            // the "Couldn't load" error screen on the next test file.
            execSync('sleep 1', {stdio: 'pipe'});
        }
    } catch {
        // App might not be running — that's fine
    }

    // 2. Find the app's data container and delete its contents.
    //    This wipes caches, preferences — but NOT the database (which lives in
    //    the App Group container, cleared separately in step 2b).
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

    // 2b. Clear the App Group container.
    //     On iOS the WatermelonDB databases live in the App Group shared directory
    //     (group.com.mattermost.rnbeta), NOT in the regular data container.
    //     Without this, stale database files survive across test files — the app
    //     relaunches with server entries from the previous test but no valid auth
    //     token (keychain was cleared in step 3), causing fetchMyChannelsForTeam
    //     to fail and the "Couldn't load" error screen to appear.
    if (!cachedAppGroupContainer) {
        cachedAppGroupContainer = resolveContainerPath(simId, 'group.com.mattermost.rnbeta');
    }
    if (cachedAppGroupContainer) {
        try {
            execSync(`find "${cachedAppGroupContainer}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +`, {stdio: 'pipe'});
            console.info(`[clearIOSAppData] Cleared App Group container: ${cachedAppGroupContainer}`);
        } catch {
            console.warn('[clearIOSAppData] App-Group-container wipe failed');
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
    await System.apiCheckSystemHealth(siteOneUrl);

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
function grantAndroidNotificationPermission(): void {
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
    // On Android, explicitly clear app data before every launch. Two reasons:
    // 1) The first-file path (newInstance, no delete) can inherit stale state
    //    from a previous CI run or pre-boot step.
    // 2) Detox's delete:true on subsequent files occasionally fails to fully
    //    clear data on CI emulators (observed: app shows channel list instead
    //    of server screen after delete:true).
    // We force-stop first so pm clear can safely wipe the data directory while
    // the app is not holding any open file handles.
    if (device.getPlatform() === 'android') {
        try {
            execSync(`adb shell am force-stop ${BUNDLE_ID}`, {stdio: 'pipe'});
        } catch { /* app may not be running */ }
        try {
            execSync(`adb shell pm clear ${BUNDLE_ID}`, {stdio: 'pipe'});
        } catch {
            // Package might not be installed yet on first run
        }
    }

    const isFirstFile = !process.env.DETOX_SETUP_DONE;
    const launchArgs = {detoxDisableSynchronization: 'YES'};

    // Android CI emulators cold-start more slowly than iOS simulators, especially
    // after adb shell pm clear wipes the data directory. Use a longer ready-timeout
    // on Android to avoid spurious launch failures that cause the cascade described
    // in the "logout-failure cascade" bug: if pm clear silently fails (adb glitch),
    // the app may launch in a logged-in state (channel_list) instead of server.screen.
    // The detection logic below handles that case explicitly.
    const APP_READY_TIMEOUT = device.getPlatform() === 'android' ? 60_000 : 30_000;

    // Force-clear Android app data via adb before each launch attempt.
    // This is a stronger reset than pm clear alone: we stop the app, clear its
    // data, and grant notification permission fresh so the app always starts
    // in a clean, logged-out state.
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

    async function launchAndVerify(): Promise<void> {
        await device.launchApp({
            newInstance: true,

            // On iOS CI (SIMULATOR_ID is set by the workflow), pass `notifications: 'YES'` so
            // Detox uses `applesimutils --restartSB --setPermissions notifications=YES`. The
            // `--restartSB` restarts iOS SpringBoard (~20–30s), flushing all stale system state
            // from the previous app session. Without this restart, iOS 26.x CI runners leave a
            // persistent work item on the main queue that blocks Detox's internal `waitForActive`
            // handshake indefinitely, causing every beforeAll to time out at 90s.
            //
            // Gated on SIMULATOR_ID (CI-only env var) because on iOS 26.3.x local simulators
            // --restartSB unregisters the app binary, breaking subsequent simctl launch calls.
            // Local machines have sufficient resources that waitForActive completes without help.
            //
            // camera/medialibrary/photos omitted — their deny counterparts corrupt the TCC
            // database on iOS 26.x (see commit 0d08de97c).
            ...(device.getPlatform() === 'ios' && process.env.SIMULATOR_ID? {permissions: {notifications: 'YES'}}: {}),
            launchArgs,
        });
        grantAndroidNotificationPermission();

        // Detox synchronization is now disabled AFTER launchApp() has returned (so the
        // Detox-to-app instrumentation channel is alive and can process the command).
        //
        // On Android (RN 0.83.9 New Architecture): FabricUIManagerIdlingResources
        // monitors the MountItemDispatcher queues. During cold boot the app performs
        // heavy work (server DB CREATE with 39 tables ~15s, batchRecords of 26 models,
        // cascading channel-list re-renders driven by combineLatest of 9+ DB observables)
        // that keeps Fabric's mount queues non-empty. Detox's idleResourceTimeoutSec
        // (now 180s in DetoxTest.java) would otherwise fire during this legitimate
        // startup window.
        //
        // On iOS 26.x (EarlGrey): a persistent pending work item on the main queue
        // prevents EarlGrey's main-queue idle check from ever resolving. Disabling
        // sync bypasses both issues; we rely on the explicit waitFor(serverScreenEl)
        // with our own timeout for readiness.
        //
        // Pattern: call disableSynchronization *after* launchApp (connection exists),
        // never before. This is the documented Detox pattern:
        // https://wix.github.io/Detox/docs/api/device/#devicedisablesynchronization
        await device.disableSynchronization();

        // Wait for server.screen (clean state). Use waitFor().withTimeout() which
        // has Detox-enforced timeout — unlike expect().toExist() which blocks
        // indefinitely when EarlGrey waits for main queue idle (iOS 26.x has a
        // persistent pending work item that prevents idle).
        const serverScreenEl = element(by.id('server.screen'));

        try {
            await waitFor(serverScreenEl).toExist().withTimeout(APP_READY_TIMEOUT);
        } catch {
            // On Android, pm clear can silently fail, leaving the app in a logged-in
            // state (channel_list visible instead of server.screen). Detect and recover.
            if (device.getPlatform() === 'android') {
                const channelListEl = element(by.id('channel_list.screen'));
                try {
                    await waitFor(channelListEl).toExist().withTimeout(5_000);
                    console.warn(
                        '[launchAndVerify] App launched in logged-in state (channel_list visible). ' +
                        'pm clear did not take effect. Retrying with force-stop + pm clear.',
                    );
                    await forceAndroidDataClear();
                    await device.launchApp({newInstance: true, launchArgs});
                    grantAndroidNotificationPermission();
                    await waitFor(serverScreenEl).toExist().withTimeout(APP_READY_TIMEOUT);
                } catch {
                    throw new Error(
                        `[launchAndVerify] Neither server.screen nor channel_list.screen appeared within ${APP_READY_TIMEOUT / 1000}s`,
                    );
                }
            } else {
                // On iOS, clearIOSAppData() can race with SQLite WAL file locks:
                // the database files survive partially, causing the app to launch
                // with stale server entries but no valid auth token. The app shows
                // "Couldn't load" (channel_list.screen exists but channels don't
                // load) instead of server.screen. Detect this and retry the wipe.
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
                        ...(process.env.SIMULATOR_ID ? {permissions: {notifications: 'YES'}} : {}),
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
        // Always clear iOS data before every file, including the first. Without this,
        // local re-runs inherit credentials/databases from the previous process, which
        // triggers the "already connected" path in server screen — the Connect tap
        // no-ops and the login form never appears, hanging beforeAll on
        // waitFor(login_form.username.input). CI fresh-boots the simulator so the first
        // file is implicitly clean there; locally we need to force it ourselves.
        // Clearing data (not uninstalling) avoids the fragile delete:true reinstall
        // cycle that breaks the Detox WebSocket on resource-constrained CI runners.
        clearIOSAppData();
    }

    // Retry loop without a Promise.race timeout wrapper.
    //
    // The earlier `withTimeout(launchAndVerify(), PER_ATTEMPT_MS)` pattern caused
    // "Detox has detected multiple interactions taking place simultaneously"
    // failures: when the outer setTimeout rejected at 120 s, the inner waitFor()
    // invoke was still pending in Detox's command queue. The retry's next
    // waitFor() then fired on top of the orphan, and Detox aborted both. ~30
    // Android beforeAll hooks were dying to this race per CI run.
    //
    // Linear `await launchAndVerify()` lets each Detox call complete or throw
    // on its own internal `withTimeout(...)` (which DOES properly cancel its
    // invoke). Between attempts the app process is force-killed, which closes
    // Detox's WebSocket and drains any still-in-flight invokes before the next
    // attempt is allowed to start.
    const MAX_LAUNCH_ATTEMPTS = 2;
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

            // Between attempts: kill the app process directly (not via
            // device.terminateApp() which can hang on iOS 26.x). Killing the
            // PID also forces Detox's WS to disconnect, which is what cleans
            // up any residual JS-side pending invokes from the failed attempt.
            if (device.getPlatform() === 'ios') {
                clearIOSAppData();
            } else if (device.getPlatform() === 'android') {
                await forceAndroidDataClear();
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

    // Admin login — populates the cookie jar for this file's apiInit() calls.
    // Server config + plugin cleanup already done once in global_setup.js.
    await loginAdmin();
}, /* timeout */ 360_000);
// Why 360s instead of relying on testTimeout=240s for this hook:
// The global beforeAll worst case is launchApp (up to ~90s on Android cold
// boot under Detox WS-handshake latency) + waitFor server.screen (60s) +
// fallback retry (~95s) + admin login (10s) = ~255s. That exceeds the 240s
// Jest hook ceiling, causing setup.ts to fire "Exceeded timeout of 240000 ms
// for a hook" on slow Android shards (40 occurrences in CI run 25947506060).
// 360s gives ~105s headroom for the actual recovery path to complete instead
// of being killed mid-launch. Per-hook timeout is scoped to this beforeAll
// only; test cases keep using the 240s testTimeout from config.js.
