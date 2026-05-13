// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Custom Jest globalSetup that wraps Detox's own globalSetup.
 *
 * Problem: Detox creates an "iPhone XX-Detox" simulator clone per run. When a
 * run ends normally, `shutdownDevice: true` shuts the clone down. But when a
 * run is killed (Ctrl+C, CI timeout, OOM), cleanup never fires — the clone
 * stays Booted, consuming RAM/CPU. The next run's allocation logic either
 * reuses it (if the registry was cleaned) or creates a new clone (if not),
 * causing accumulation over repeated aborted runs.
 *
 * Fix: before Detox allocates any device, read Detox's own device registry
 * (~/Library/Detox/device.registry.json) to find devices owned by dead PIDs
 * ("zombie" ownership), then shut down those simulators. Detox's own
 * `unregisterZombieDevices()` already removes them from the registry; this
 * closes the gap by also stopping the dangling simulator process.
 *
 * Parallel safety: only simulators whose owning PID is dead are shut down.
 * A simulator owned by a live PID belongs to a concurrent `detox test`
 * invocation on the same machine and is left completely untouched.
 *
 * Android / non-macOS: no-op — emulators are not cloned per-run.
 */

const {execFileSync, execSync} = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');

const axios = require('axios');

const DEVICE_REGISTRY_PATH = path.join(
    os.homedir(),
    'Library', 'Detox', 'device.registry.json',
);

/**
 * Returns true if a process with the given PID is currently running.
 * Uses kill -0 which checks existence without sending a signal.
 */
function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false; // ESRCH = no such process
    }
}

/**
 * Read Detox's device registry and return UDIDs of zombie-owned entries
 * (i.e. registered devices whose owner PID is no longer running).
 */
function getZombieDeviceUdids() {
    try {
        const raw = fs.readFileSync(DEVICE_REGISTRY_PATH, 'utf8');
        const entries = JSON.parse(raw);
        return entries.
            filter((entry) => entry.pid && !isPidAlive(entry.pid)).
            map((entry) => entry.id);
    } catch {
        return []; // registry missing or malformed — nothing to clean
    }
}

/**
 * Shut down any iOS simulator clones that belong to dead Detox processes.
 * Only runs on macOS; silently skips on other platforms.
 */
function shutdownZombieSimulators() {
    if (process.platform !== 'darwin') {
        return;
    }

    const zombieIds = getZombieDeviceUdids();
    if (zombieIds.length === 0) {
        return;
    }

    // Parse the full simulator list once
    let simsByUdid;
    try {
        const json = execSync('xcrun simctl list devices -j', {stdio: 'pipe'}).toString();
        const {devices} = JSON.parse(json);
        simsByUdid = {};
        for (const sims of Object.values(devices)) {
            for (const sim of sims) {
                simsByUdid[sim.udid] = sim;
            }
        }
    } catch {
        return; // simctl unavailable — non-fatal
    }

    for (const udid of zombieIds) {
        const sim = simsByUdid[udid];
        if (!sim) {
            continue; // not a simulator (could be an Android emulator ID)
        }
        if (sim.state !== 'Booted') {
            continue; // already Shutdown — nothing to do
        }

        try {
            // Use execFileSync (not execSync) so udid is passed as an argument,
            // never interpolated into a shell string — eliminates any injection risk.
            execFileSync('xcrun', ['simctl', 'shutdown', udid], {stdio: 'pipe'});
            process.stdout.write(`[globalSetup] Shut down zombie Detox simulator: ${sim.name} (${udid})\n`);
        } catch {
            process.stderr.write(`[globalSetup] Could not shut down ${udid} — continuing\n`);
        }
    }
}

// ─── One-time server setup ──────────────────────────────────────────────────
// Runs once before any test files load. Uses raw axios (no TS, no Detox device).
// Ensures the test server is healthy, configured for CI, and has plugins cleaned up.

const SITE_URL = process.env.SITE_1_URL || 'http://localhost:8065';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sysadmin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';

// Prepackaged plugins that should NOT be disabled
const PREPACKAGED_PLUGINS = new Set([
    'antivirus',
    'mattermost-autolink',
    'com.mattermost.aws-sns',
    'com.mattermost.plugin-channel-export',
    'com.mattermost.custom-attributes',
    'github',
    'com.github.manland.mattermost-plugin-gitlab',
    'com.mattermost.plugin-incident-management',
    'jenkins',
    'jira',
    'com.mattermost.calls',
    'com.mattermost.nps',
    'com.mattermost.welcomebot',
    'zoom',
]);

async function retryAxios(fn, {retries = 4, delayMs = 3000, label = 'request'} = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn(); // eslint-disable-line no-await-in-loop
        } catch (err) {
            lastErr = err;
            const status = err.response?.status;
            const retriable = !status || status >= 500;
            if (attempt === retries || !retriable) {
                throw err;
            }
            const wait = delayMs * attempt;
            process.stderr.write(
                `[globalSetup] ⚠️ ${label} attempt ${attempt} failed (${err.message}), retrying in ${wait}ms…\n`,
            );
            await new Promise((r) => setTimeout(r, wait)); // eslint-disable-line no-await-in-loop
        }
    }
    throw lastErr;
}

async function serverSetup() {
    // Stagger shard startup: shard N waits N*1500ms so shards don't all hammer
    // the server simultaneously. With 20 shards this spreads load across 30s.
    // Only applies in CI (CI_NODE_INDEX is set by the test matrix).
    const nodeIndex = parseInt(process.env.CI_NODE_INDEX || '0', 10);
    if (nodeIndex > 0) {
        process.stdout.write(`[globalSetup] Shard ${nodeIndex}: staggering startup by ${nodeIndex * 1500}ms\n`);
        await new Promise((r) => setTimeout(r, nodeIndex * 1500)); // eslint-disable-line no-promise-executor-return
    }

    // Force IPv4 to avoid IPv6 connection timeouts in CI
    http.globalAgent.options.family = 4;
    https.globalAgent.options.family = 4;

    // 1. Health check — retry on transient 5xx / network errors
    const ping = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/system/ping?get_server_status=true`),
        {label: 'health check'},
    );
    if (ping.data.status !== 'OK') {
        throw new Error(`Server health check failed: ${JSON.stringify(ping.data)}`);
    }
    process.stdout.write('[globalSetup] ✅ Server health check passed\n');
    process.stdout.write(
        '[globalSetup] Server info:\n' +
        `  URL:          ${SITE_URL}\n` +
        `  Version:      ${ping.data.version}\n` +
        `  Build number: ${ping.data.build_number}\n` +
        `  Build date:   ${ping.data.build_date}\n` +
        `  Build hash:   ${ping.data.build_hash}\n` +
        `  Enterprise:   ${ping.data.enterprise_ready}\n`,
    );

    // 2. Admin login — get Bearer token for subsequent API calls
    const login = await retryAxios(
        () => axios.post(`${SITE_URL}/api/v4/users/login`, {
            login_id: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
        }),
        {label: 'admin login'},
    );
    const token = login.headers.token;
    if (!token) {
        throw new Error('Admin login did not return a token');
    }
    const headers = {Authorization: `Bearer ${token}`};
    process.stdout.write('[globalSetup] ✅ Admin login successful\n');

    // 3. Patch server config for CI (long session, high rate limits)
    try {
        await axios.put(`${SITE_URL}/api/v4/config/patch`, {
            ServiceSettings: {SessionLengthWebInHours: 4320},
            RateLimitSettings: {PerSec: 10000, MaxBurst: 999999},

            // Enable ExperimentalEnableAutomaticReplies globally so the Auto-Responder
            // option appears in Notification Settings on all shards without requiring
            // each test suite's beforeAll to enable it first.
            TeamSettings: {ExperimentalEnableAutomaticReplies: true},

            // Disable the watermark overlay (MM-68274): it renders as an absoluteFillObject
            // at 45% opacity and persists as an RNN overlay across all screens. EarlGrey's
            // hittability check requires 100% visual coverage at the activation point, so
            // even pointerEvents='none' watermarks fail Detox gesture assertions.
            ExperimentalSettings: {EnableWatermark: false},

            // Enable the remote cluster service so the share_with_connected_workspaces
            // suite's beforeAll can create a remote cluster. Per-test config patches hit
            // a race where apiCreateRemoteCluster runs before the patch settles, causing
            // "The remote cluster service is not enabled." on fresh test servers.
            ConnectedWorkspacesSettings: {EnableRemoteClusterService: true},
        }, {headers});
        process.stdout.write('[globalSetup] ✅ Server configured for CI\n');
    } catch (err) {
        // Non-fatal: env-var-locked settings may reject the patch
        process.stderr.write(`[globalSetup] ⚠️ Could not patch server config: ${err.message}\n`);
    }

    // 4. Disable non-prepackaged plugins
    const plugins = await axios.get(`${SITE_URL}/api/v4/plugins`, {headers});
    const active = plugins.data?.active || [];
    const toDisable = active.filter(
        (plugin) => !PREPACKAGED_PLUGINS.has(plugin.id) && plugin.id !== 'com.mattermost.demo-plugin',
    );
    await Promise.all(toDisable.map((plugin) => {
        process.stdout.write(`[globalSetup] Disabling plugin: ${plugin.id}\n`);
        return axios.post(
            `${SITE_URL}/api/v4/plugins/${encodeURIComponent(plugin.id)}/disable`,
            null,
            {headers},
        );
    }));
    process.stdout.write('[globalSetup] ✅ Plugin cleanup done\n');
}

module.exports = async () => {
    shutdownZombieSimulators();
    await serverSetup();
    return require('detox/runners/jest/globalSetup')();
};
