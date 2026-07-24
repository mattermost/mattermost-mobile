// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Wraps Detox globalSetup: shuts down zombie iOS simulator clones from aborted runs.

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

function isPidAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false; // ESRCH = no such process
    }
}

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

function shutdownZombieSimulators() {
    if (process.platform !== 'darwin') {
        return;
    }

    const zombieIds = getZombieDeviceUdids();
    if (zombieIds.length === 0) {
        return;
    }

    // Parse simulator list once.
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
            execFileSync('xcrun', ['simctl', 'shutdown', udid], {stdio: 'pipe'});
            process.stdout.write(`[globalSetup] Shut down zombie Detox simulator: ${sim.name} (${udid})\n`);
        } catch {
            process.stderr.write(`[globalSetup] Could not shut down ${udid} — continuing\n`);
        }
    }
}

// One-time server health check and CI config before tests load.

const SITE_URL = process.env.SITE_1_URL || 'http://localhost:8065';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sysadmin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';

// Prepackaged plugins to keep enabled.
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
    const nodeIndex = parseInt(process.env.CI_NODE_INDEX || '0', 10);
    if (nodeIndex > 0) {
        process.stdout.write(`[globalSetup] Shard ${nodeIndex}: staggering startup by ${nodeIndex * 1500}ms\n`);
        await new Promise((r) => setTimeout(r, nodeIndex * 1500));
    }

    http.globalAgent.options.family = 4;
    https.globalAgent.options.family = 4;

    const ping = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/system/ping?get_server_status=true`),
        {label: 'health check'},
    );
    if (ping.data.status !== 'OK') {
        throw new Error(`Server health check failed: ${JSON.stringify(ping.data)}`);
    }
    process.stdout.write('[globalSetup] ✅ Server health check passed\n');

    const clientConfig = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/config/client?format=old`),
        {label: 'client config'},
    );
    const cfg = clientConfig.data || {};
    process.stdout.write(
        '[globalSetup] Server info:\n' +
        `  URL:          ${SITE_URL}\n` +
        `  Version:      ${cfg.Version}\n` +
        `  Build number: ${cfg.BuildNumber}\n` +
        `  Build date:   ${cfg.BuildDate}\n` +
        `  Build hash:   ${cfg.BuildHash}\n` +
        `  Enterprise:   ${cfg.BuildEnterpriseReady}\n`,
    );

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

    // ponytail: pre-warm the server connection with a post-login ping so the first
    // app-level request isn't also the server's first cold request. (Note: this warms
    // the SERVER, not the iOS sim's own TLS session — it won't prevent -1005 drops on
    // the app's first POST, but it's a cheap best-effort.)
    try {
        await axios.get(`${SITE_URL}/api/v4/system/ping`);
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ post-login ping failed (${err.message}) — continuing\n`);
    }

    try {
        await axios.get(`${SITE_URL}/api/v4/system/ping`);
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ post-login ping failed (${err.message}) — continuing\n`);
    }

    try {
        await axios.get(`${SITE_URL}/api/v4/system/ping`);
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ post-login ping failed (${err.message}) — continuing\n`);
    }

    try {
        await axios.put(`${SITE_URL}/api/v4/config/patch`, {
            ServiceSettings: {
                SessionLengthWebInHours: 4320,
                MaximumActiveUsers: 999999,
            },
            RateLimitSettings: {PerSec: 10000, MaxBurst: 999999},
            TeamSettings: {ExperimentalEnableAutomaticReplies: true},
            ExperimentalSettings: {EnableWatermark: false},
            ConnectedWorkspacesSettings: {EnableRemoteClusterService: true},
        }, {headers});
        process.stdout.write('[globalSetup] ✅ Server configured for E2E tests\n');
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ Could not patch server config: ${err.message}\n`);
    }

    try {
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
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ Could not clean up plugins: ${err.message}\n`);
    }
}

module.exports = async () => {
    shutdownZombieSimulators();
    await serverSetup();
    return require('detox/runners/jest/globalSetup')();
};
