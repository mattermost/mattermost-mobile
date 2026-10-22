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

const {isRetriableCloudWarmupError} = require('../utils/retriable_cloud_error');

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

// Resolve the health-check URL the same way test_config does: an explicit SITE_1_URL
// wins (CI sets it per shard); otherwise fall back to the platform-specific URL so a
// local .env without SITE_1_URL still works on both iOS and Android runs.
const _isIos = process.env.IOS === 'true';
const _platformSiteOneUrl = _isIos ? process.env.IOS_SITE_1_URL : process.env.ANDROID_SITE_1_URL;
const SITE_URL = process.env.SITE_1_URL || _platformSiteOneUrl || 'http://localhost:8065';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'sysadmin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sys@dmin-sample1';

// Plugins in this set are never disabled by this setup; provisioning owns them (provision/constants.ts).
// The demo plugin is installed only on server B.
const PROVISIONED_PLUGINS = new Set(['mattermost-ai', 'com.mattermost.calls', 'com.mattermost.demo-plugin']);

// Prepackaged plugins to keep enabled (shared with provisioning).
const PREPACKAGED_PLUGINS = new Set(require('../shared/prepackaged-plugins.json'));

async function disableStrayPlugins(headers) {
    try {
        const plugins = await axios.get(`${SITE_URL}/api/v4/plugins`, {headers});
        const active = plugins.data?.active || [];
        const toDisable = active.filter(
            (plugin) => !PREPACKAGED_PLUGINS.has(plugin.id) && !PROVISIONED_PLUGINS.has(plugin.id),
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

// Match Maestro seed.ts: Matterwick can 403 / serve the inactive portal for ~2min.
const WARMUP_RETRIES = 8;
const WARMUP_DELAY_MS = 15000;

/**
 * The permission policy actions this server supports, comma-separated, so suites can gate on one
 * (see serverSupportsPolicyAction). New actions ship without a feature flag, so this asks the
 * render-time decisions endpoint: called without `actions`, it returns a decision for every action
 * the server registers for channels.
 * Returns '' on servers without the endpoint (before 12.0), and undefined when it can't tell.
 */
async function detectPolicyActions(headers) {
    const options = {headers, validateStatus: () => true};
    try {
        // The endpoint evaluates against a real channel. The admin's DM with themselves works even on
        // a server with no teams or channels, and creating it again returns the same one, so there's
        // nothing to clean up.
        const me = await axios.get(`${SITE_URL}/api/v4/users/me`, options);
        const userId = me.data?.id;
        if (!userId) {
            return undefined;
        }
        const selfDm = await axios.post(`${SITE_URL}/api/v4/channels/direct`, [userId, userId], options);
        const channelId = selfDm.data?.id;
        if (!channelId) {
            return undefined;
        }

        const search = await axios.post(
            `${SITE_URL}/api/v4/access_control/decisions/actions/search`,
            {resource: {type: 'channel', id: channelId}},
            options,
        );
        if (search.status === 404) {
            return '';
        }
        const decisions = search.data?.decisions;
        if (search.status !== 200 || !decisions || typeof decisions !== 'object') {
            return undefined;
        }
        return Object.keys(decisions).join(',');
    } catch {
        return undefined;
    }
}

async function retryAxios(fn, {retries = 4, delayMs = 3000, label = 'request'} = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn(); // eslint-disable-line no-await-in-loop
        } catch (err) {
            lastErr = err;
            const status = err.response?.status;
            const body = err.response?.data;
            const retriable = isRetriableCloudWarmupError({
                status,
                message: err.message,
                body,
            });
            if (attempt === retries || !retriable) {
                const data = err.response?.data;
                let bodyLength = 0;
                if (typeof data === 'string') {
                    bodyLength = data.length;
                } else if (Buffer.isBuffer(data)) {
                    bodyLength = data.length;
                } else if (data != null) {
                    try {
                        bodyLength = JSON.stringify(data).length;
                    } catch {
                        bodyLength = -1;
                    }
                }
                throw new Error(
                    `[globalSetup] ${label} failed against ${SITE_URL}` +
                    `${status ? ` with status ${status}` : ''}` +
                    `${err.code ? ` code ${err.code}` : ''}: ${err.message} (body length ${bodyLength})`,
                );
            }
            process.stderr.write(
                `[globalSetup] ⚠️ ${label} attempt ${attempt}/${retries} failed (${err.message}), retrying in ${delayMs}ms…\n`,
            );
            await new Promise((r) => setTimeout(r, delayMs)); // eslint-disable-line no-await-in-loop
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

    await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/system/ping?get_server_status=true`).then((res) => {
            if (res.data?.status !== 'OK') {
                const snippet = typeof res.data === 'string'
                    ? res.data.slice(0, 200)
                    : JSON.stringify(res.data);
                const err = new Error(`Server health check failed: ${snippet}`);
                err.response = res;
                throw err;
            }
            return res;
        }),
        {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'health check'},
    );
    process.stdout.write('[globalSetup] ✅ Server health check passed\n');

    const clientConfig = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/config/client?format=old`),
        {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'client config'},
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

    // Jest starts workers after globalSetup, so this env reaches every spec file, letting a
    // suite gate itself synchronously at describe() time. A flag the server does not define is
    // ABSENT from the client config rather than "false", so presence is the feature signal.
    // Version is always present, so its absence means this is not a client config at all —
    // treating that as "feature absent" would quarantine a suite silently.
    if (!cfg.Version) {
        throw new Error(
            `[globalSetup] client config from ${SITE_URL} has no Version field, so feature detection is unreliable. ` +
            `Received keys: ${Object.keys(cfg).slice(0, 10).join(', ') || '(none)'}`,
        );
    }

    process.env.MM_SERVER_HAS_CHANNEL_ATTRIBUTES = cfg.FeatureFlagChannelAttributes === undefined ? 'false' : 'true';
    if (process.env.MM_SERVER_HAS_CHANNEL_ATTRIBUTES === 'false') {
        process.stdout.write(`[globalSetup] FeatureFlagChannelAttributes is absent on ${cfg.Version} — the Channel Attributes suite will be skipped\n`);
    }

    const login = await retryAxios(
        () => axios.post(`${SITE_URL}/api/v4/users/login`, {
            login_id: ADMIN_USERNAME,
            password: ADMIN_PASSWORD,
        }),
        {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'admin login'},
    );
    const token = login.headers.token;
    if (!token) {
        throw new Error('Admin login did not return a token');
    }
    const headers = {Authorization: `Bearer ${token}`};
    process.stdout.write('[globalSetup] ✅ Admin login successful\n');

    const policyActions = await detectPolicyActions(headers);
    if (policyActions === undefined) {
        process.stderr.write('[globalSetup] ⚠️ Could not detect supported permission policy actions — no suite will be skipped for them\n');
    } else {
        process.env.MM_SERVER_POLICY_ACTIONS = policyActions;
        process.stdout.write(`[globalSetup] Permission policy actions: ${policyActions || '(none)'}\n`);
    }

    // Pre-warm the server so the first app request isn't also the server's cold start. This
    // does not warm the simulator's TLS session, so -1005 drops are still possible.
    try {
        await axios.get(`${SITE_URL}/api/v4/system/ping`);
    } catch (err) {
        process.stderr.write(`[globalSetup] ⚠️ post-login ping failed (${err.message}) — continuing\n`);
    }

    // Server config comes from provisioning (detox/shared/server-baseline.ts); shards only probe it.

    // Shared Channels needs the license feature and a running remote-cluster service; probing here
    // lets the suite report as skipped rather than passed on a server that cannot run it.
    const license = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/license/client?format=old`, {headers}),
        {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'client license'},
    );
    let sharedChannelsReason = `license ${license.data?.SkuShortName || 'none'} has no SharedChannels`;
    process.env.MM_SERVER_HAS_SHARED_CHANNELS = 'false';
    if (license.data?.SharedChannels === 'true') {
        const remotes = await retryAxios(
            () => axios.get(`${SITE_URL}/api/v4/remotecluster`, {headers, validateStatus: () => true}),
            {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'remote cluster probe'},
        );
        process.env.MM_SERVER_HAS_SHARED_CHANNELS = remotes.status === 200 ? 'true' : 'false';
        sharedChannelsReason = `license ${license.data.SkuShortName}, GET /remotecluster returned ${remotes.status}`;
    }
    process.stdout.write(`[globalSetup] Shared Channels available: ${process.env.MM_SERVER_HAS_SHARED_CHANNELS} (${sharedChannelsReason})\n`);

    // An env-pinned MaxFileSize ignores API patches, so a spec that must shrink it cannot run.
    const environment = await retryAxios(
        () => axios.get(`${SITE_URL}/api/v4/config/environment`, {headers}),
        {retries: WARMUP_RETRIES, delayMs: WARMUP_DELAY_MS, label: 'config environment'},
    );
    process.env.MM_SERVER_MAX_FILE_SIZE_PINNED = environment.data?.FileSettings?.MaxFileSize === true ? 'true' : 'false';
    process.stdout.write(`[globalSetup] MaxFileSize env-pinned: ${process.env.MM_SERVER_MAX_FILE_SIZE_PINNED}\n`);

    // Pool servers are read-only to shards; provisioning disables stray plugins there once per run.
    if (process.env.CI === 'true' && process.env.E2E_SERVER_ROLE === 'pool') {
        process.stdout.write('[globalSetup] Plugin cleanup skipped on a pool shard (owned by provisioning)\n');
    } else {
        await disableStrayPlugins(headers);
    }
}

module.exports = async () => {
    shutdownZombieSimulators();
    await serverSetup();
    return require('detox/runners/jest/globalSetup')();
};
