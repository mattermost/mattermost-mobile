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

// Plugins to install after licensing. URLs are resolved at provision time
// from the GitHub `releases/latest` endpoint so we don't drift behind upstream
// pin bumps. fallbackVersion is the last-known-good if the GitHub API call
// fails (rate limit, outage). The installPlugin function below also falls
// back to the server's Marketplace if the URL install errors out, so this is
// defense-in-depth.
//
// Asset naming convention (consistent across mattermost/mattermost-plugin-*):
//   <repo>/releases/download/v<ver>/mattermost-plugin-<name>-v<ver>-linux-amd64.tar.gz
const REQUIRED_PLUGINS = [
    {
        id: 'mattermost-ai',
        repo: 'mattermost/mattermost-plugin-agents',
        assetName: 'mattermost-plugin-agents',
        fallbackVersion: '1.14.0',
    },
    {
        id: 'com.mattermost.calls',
        repo: 'mattermost/mattermost-plugin-calls',
        assetName: 'mattermost-plugin-calls',
        fallbackVersion: '1.11.5',
    },
];

// Fetch the latest release tag for a GitHub repo. Strips the 'v' prefix so the
// caller can interpolate cleanly into both the tag path (`v${ver}`) and the
// asset filename (`-v${ver}-`). Authenticates with GITHUB_TOKEN if present
// (bumps GitHub's 60 req/hr unauthenticated limit to 5000 req/hr — CI runners
// share IPs and can blow through 60 quickly).
function fetchLatestVersion(repo) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${repo}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'mattermost-mobile-provisioner',
                Accept: 'application/vnd.github+json',
                ...(process.env.GITHUB_TOKEN ? {Authorization: `Bearer ${process.env.GITHUB_TOKEN}`} : {}),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    if (!parsed.tag_name) {
                        reject(new Error(`GitHub API response missing tag_name: ${data.slice(0, 200)}`));
                        return;
                    }
                    const tag = parsed.tag_name;
                    resolve(tag.startsWith('v') ? tag.substring(1) : tag);
                } catch (err) {
                    reject(err);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// Resolve the latest version from GitHub, falling back to the pinned
// last-known-good if the API call fails. Returns a fully-built download URL.
async function resolvePluginUrl(plugin) {
    let version;
    try {
        version = await fetchLatestVersion(plugin.repo);
        console.log(`[provision] ${plugin.repo}: latest=v${version}`);
    } catch (err) {
        version = plugin.fallbackVersion;
        console.warn(`[provision] ${plugin.repo}: GitHub API lookup failed (${err.message}); falling back to v${version}.`);
    }
    return `https://github.com/${plugin.repo}/releases/download/v${version}/${plugin.assetName}-v${version}-linux-amd64.tar.gz`;
}

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

async function configureTestServer(token) {
    // Fetch current config, then update plugin + rate-limit settings in a single PUT.
    const configRes = await request('GET', '/api/v4/config', null, token);
    if (configRes.status >= 400) {
        console.warn('[provision] Could not read server config.');
        return;
    }

    const config = configRes.data;

    config.PluginSettings = config.PluginSettings || {};
    config.PluginSettings.EnableUploads = true;
    config.PluginSettings.EnableMarketplace = true;
    config.PluginSettings.EnableRemoteMarketplace = true;
    config.RateLimitSettings = config.RateLimitSettings || {};
    config.RateLimitSettings.Enable = false;
    config.ServiceSettings = config.ServiceSettings || {};
    config.ServiceSettings.MaximumActiveUsers = 999999; // effectively unlimited
    config.ServiceSettings.MaximumLoginAttempts = 999999;
    config.PasswordSettings = config.PasswordSettings || {};
    config.PasswordSettings.MinimumLength = 8;
    config.TeamSettings = config.TeamSettings || {};
    config.TeamSettings.MaxUsersPerTeam = 999999;
    config.TeamSettings.ExperimentalViewArchivedChannels = true;
    config.ServiceSettings.EnableBotAccountCreation = true;
    config.ConnectedWorkspacesSettings = config.ConnectedWorkspacesSettings || {};
    config.ConnectedWorkspacesSettings.EnableSharedChannels = true;
    config.ConnectedWorkspacesSettings.EnableRemoteClusterService = true;
    config.ExperimentalSettings = config.ExperimentalSettings || {};
    config.ExperimentalSettings.EnableSharedChannels = true;
    config.ExperimentalSettings.EnableRemoteClusterService = true;
    config.FeatureFlags = config.FeatureFlags || {};
    config.FeatureFlags.CustomProfileAttributes = true;
    config.PluginSettings.Plugins = config.PluginSettings.Plugins || {};
    config.PluginSettings.Plugins['com.mattermost.calls'] = {
        ...(config.PluginSettings.Plugins['com.mattermost.calls'] || {}),
        DefaultEnabled: true,
    };
    config.ServiceSettings.EnableChannelBookmarks = true;

    // Required by detox agents tests (channel_summary, tool_calls_in_channels):
    // the Ask Agents quick action and /api/v4/agents/status availability require
    // the agents plugin to have at least one configured bot. The service points
    // at a mock upstream — tests never invoke a real LLM (tool-call posts are
    // seeded directly via the REST API). Shape mirrors the plugin's own e2e
    // fixture (mattermost-plugin-agents e2e/helpers/plugincontainer.ts).
    config.PluginSettings.Plugins['mattermost-ai'] = {
        ...(config.PluginSettings.Plugins['mattermost-ai'] || {}),
        config: {
            services: [{
                id: 'mock-service',
                name: 'Mock Service',
                type: 'openaicompatible',
                apiKey: 'mock',
                apiURL: 'http://localhost:9099',
                defaultModel: 'gpt-mock',
                useResponsesAPI: false,
            }],
            bots: [{
                id: 'e2emockbot',
                name: 'mock',
                displayName: 'Mock Bot',
                customInstructions: '',
                serviceID: 'mock-service',
            }],
            defaultBotName: 'mock',
        },
    };

    // Required by maestro/flows/account/attach_logs_*.yml: keep the in-app
    // Report a Problem screen reachable (not redirected to email/browser) and
    // make the log-attachment toggle visible. These match server defaults but
    // set explicitly so a previously-toggled-off config can't break the flow.
    config.ServiceSettings.ReportAProblemType = 'default';
    config.ServiceSettings.AllowDownloadLogs = true;

    console.log('[provision] Updating plugin uploads, Marketplace, disabling rate limiting, and removing user caps...');
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
    await configureTestServer(token);

    for (const plugin of REQUIRED_PLUGINS) {
        // eslint-disable-next-line no-await-in-loop
        const url = await resolvePluginUrl(plugin);
        // eslint-disable-next-line no-await-in-loop
        await installPlugin(token, {id: plugin.id, url});
    }

    console.log('[provision] Server provisioning complete.');
}

main().catch((err) => {
    console.error('[provision] Fatal error:', err.message);
    process.exit(1);
});
