#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/**
 * Provisions a Mattermost test server for E2E tests:
 * 1. Logs in as admin
 * 2. Requests a trial Enterprise license if not already licensed
 * 3. Installs required plugins from Marketplace (e.g. mattermost-ai)
 *
 * Usage: node provision_server.js <server_url>
 *
 * Environment variables:
 *   ADMIN_USERNAME - admin username (default: from MM_MOBILE_E2E_ADMIN_USERNAME)
 *   ADMIN_PASSWORD - admin password (default: from MM_MOBILE_E2E_ADMIN_PASSWORD)
 */

const http = require('http');
const https = require('https');

const serverUrl = process.argv[2];
if (!serverUrl) {
    console.error('Usage: node provision_server.js <server_url>');
    process.exit(1);
}

// Validate server URL to prevent SSRF and credential exfiltration.
// Only allow HTTPS URLs on known Mattermost-operated domains.
const ALLOWED_DOMAIN_PATTERNS = [
    /\.cloud\.mattermost\.com$/,
    /\.test\.mattermost\.cloud$/,
    /\.mattermost\.com$/,
    /\.mattermost\.cloud$/,
];

function validateServerUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        console.error(`Invalid URL: ${url}`);
        process.exit(1);
    }

    if (parsed.protocol !== 'https:') {
        console.error(`Only HTTPS URLs are allowed, got: ${parsed.protocol}`);
        process.exit(1);
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private/internal IPs
    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|localhost|::1|\[::1\])/.test(hostname)) {
        console.error(`Private/internal URLs are not allowed: ${hostname}`);
        process.exit(1);
    }

    const isDomainAllowed = ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
    if (!isDomainAllowed) {
        console.error(`Domain not in allowlist: ${hostname}. Allowed patterns: ${ALLOWED_DOMAIN_PATTERNS.map((p) => p.source).join(', ')}`);
        process.exit(1);
    }
}

validateServerUrl(serverUrl);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required');
    process.exit(1);
}

// Plugins to install after licensing.
// Each entry has an id and an optional url for direct download (used when Marketplace doesn't have it).
const REQUIRED_PLUGINS = [
    {
        id: 'mattermost-ai',
        url: 'https://github.com/mattermost/mattermost-plugin-agents/releases/download/v1.14.0/mattermost-plugin-agents-v1.14.0-linux-amd64.tar.gz',
    },
];

function request(method, urlPath, body, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(serverUrl + urlPath);
        const lib = url.protocol === 'https:' ? https : http;
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? {Authorization: `Bearer ${token}`} : {}),
                ...(payload ? {'Content-Length': Buffer.byteLength(payload)} : {}),
            },
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({data: parsed, status: res.statusCode, headers: res.headers});
                } catch {
                    resolve({data, status: res.statusCode, headers: res.headers});
                }
            });
        });

        req.on('error', reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

async function login() {
    console.log(`[provision] Logging in to ${serverUrl}...`);
    const res = await request('POST', '/api/v4/users/login', {
        login_id: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
    });

    if (res.status >= 400) {
        throw new Error(`Login failed (HTTP ${res.status}): ${res.data.message || JSON.stringify(res.data)}`);
    }

    const token = res.headers.token;
    if (!token) {
        throw new Error('Login succeeded but no token in response headers');
    }

    console.log('[provision] Admin login successful.');
    return token;
}

async function ensureTrialLicense(token) {
    // Check current license
    const licenseRes = await request('GET', '/api/v4/license/client?format=old', null, token);
    if (licenseRes.data.IsLicensed === 'true') {
        console.log('[provision] Server already has Enterprise license.');
        return;
    }

    console.log('[provision] No Enterprise license — requesting trial...');
    const trialRes = await request('POST', '/api/v4/trial-license', {
        users: 1000,
        terms_accepted: true,
        receive_emails_accepted: true,
        contact_name: 'E2E Test',
        contact_email: 'admin@example.mattermost.com',
        company_name: 'Mattermost E2E',
        company_country: 'US',
        company_size: 'ONE_TO_50',
    }, token);

    if (trialRes.status >= 400) {
        console.warn(`[provision] Trial license request failed (HTTP ${trialRes.status}): ${trialRes.data.message || JSON.stringify(trialRes.data)}`);
        return;
    }

    console.log('[provision] Trial Enterprise license activated.');
}

async function enablePluginUploads(token) {
    const configRes = await request('GET', '/api/v4/config', null, token);
    if (configRes.status >= 400) {
        console.warn('[provision] Could not read server config.');
        return;
    }

    const config = configRes.data;
    if (config.PluginSettings?.EnableUploads && config.PluginSettings?.EnableMarketplace) {
        return;
    }

    console.log('[provision] Enabling plugin uploads and Marketplace...');
    config.PluginSettings = config.PluginSettings || {};
    config.PluginSettings.EnableUploads = true;
    config.PluginSettings.EnableMarketplace = true;
    config.PluginSettings.EnableRemoteMarketplace = true;

    const updateRes = await request('PUT', '/api/v4/config', config, token);
    if (updateRes.status >= 400) {
        console.warn(`[provision] Config update failed (HTTP ${updateRes.status}): ${updateRes.data.message || JSON.stringify(updateRes.data)}`);
    }
}

async function installPlugin(token, {id: pluginId, url: pluginUrl}) {
    // Check if already installed
    const pluginsRes = await request('GET', '/api/v4/plugins', null, token);
    if (pluginsRes.status >= 400) {
        console.warn(`[provision] Could not list plugins: ${pluginsRes.data.message || ''}`);
        return;
    }

    const {active = [], inactive = []} = pluginsRes.data;
    const isActive = active.some((p) => p.id === pluginId);
    const isInactive = inactive.some((p) => p.id === pluginId);

    if (isActive) {
        console.log(`[provision] Plugin ${pluginId} is already installed and active.`);
        return;
    }

    if (isInactive) {
        console.log(`[provision] Plugin ${pluginId} is installed but inactive, enabling...`);
        const enableRes = await request('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
        if (enableRes.status >= 400) {
            console.warn(`[provision] Failed to enable ${pluginId} (HTTP ${enableRes.status}): ${enableRes.data.message || JSON.stringify(enableRes.data)}`);
        } else {
            console.log(`[provision] Plugin ${pluginId} enabled.`);
        }
        return;
    }

    // Try URL-based install first (for plugins not in Marketplace)
    if (pluginUrl) {
        console.log(`[provision] Installing ${pluginId} from URL: ${pluginUrl}`);
        const urlInstallRes = await request('POST', `/api/v4/plugins/install_from_url?plugin_download_url=${encodeURIComponent(pluginUrl)}&force=true`, null, token);
        if (urlInstallRes.status < 400) {
            console.log(`[provision] Enabling ${pluginId}...`);
            const enableRes = await request('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
            if (enableRes.status >= 400) {
                console.warn(`[provision] Failed to enable ${pluginId} (HTTP ${enableRes.status}): ${enableRes.data.message || JSON.stringify(enableRes.data)}`);
            } else {
                console.log(`[provision] Plugin ${pluginId} installed and enabled from URL.`);
            }
            return;
        }
        console.warn(`[provision] URL install failed for ${pluginId} (HTTP ${urlInstallRes.status}): ${urlInstallRes.data.message || JSON.stringify(urlInstallRes.data)}`);
    }

    // Fallback to Marketplace
    console.log(`[provision] Installing ${pluginId} from Marketplace...`);
    const installRes = await request('POST', '/api/v4/plugins/marketplace', {id: pluginId}, token);
    if (installRes.status >= 400) {
        console.warn(`[provision] Marketplace install failed for ${pluginId} (HTTP ${installRes.status}): ${installRes.data.message || JSON.stringify(installRes.data)}`);
        return;
    }

    console.log(`[provision] Enabling ${pluginId}...`);
    const postInstallEnableRes = await request('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
    if (postInstallEnableRes.status >= 400) {
        console.warn(`[provision] Failed to enable ${pluginId} after install (HTTP ${postInstallEnableRes.status}): ${postInstallEnableRes.data.message || JSON.stringify(postInstallEnableRes.data)}`);
    } else {
        console.log(`[provision] Plugin ${pluginId} installed and enabled from Marketplace.`);
    }
}

async function main() {
    const token = await login();
    await ensureTrialLicense(token);
    await enablePluginUploads(token);

    for (const plugin of REQUIRED_PLUGINS) {
        await installPlugin(token, plugin); // eslint-disable-line no-await-in-loop
    }

    console.log('[provision] Server provisioning complete.');
}

main().catch((err) => {
    console.error('[provision] Fatal error:', err.message);
    process.exit(1);
});
