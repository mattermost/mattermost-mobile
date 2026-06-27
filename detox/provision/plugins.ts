// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */

import https from 'node:https';
import path from 'node:path';

import {
    AGENTS_PLUGIN_ID,
    AGENTS_PLUGIN_ASSET_NAME,
    AGENTS_PLUGIN_FALLBACK_VERSION,
    AGENTS_PLUGIN_REPO,
    PLUGIN_STATE_FAILED,
    PLUGIN_STATE_RUNNING,
} from './constants';
import {getAgentsPluginDownloadUrl} from './env';
import {sleep, uploadMultipartFile} from './http-client';
import {logInfo, logWarn} from './log';

import type {
    MattermostClient,
    PluginInstallResult,
    PluginListEntry,
    PluginStatus,
    PluginsPayload,
    RequiredPlugin,
} from './types';

type ApiErrorBody = {message?: string};
type GitHubLatestRelease = {tag_name?: string};

function fetchLatestPluginVersion(repo: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/${repo}/releases/latest`,
            method: 'GET',
            headers: {
                'User-Agent': 'mattermost-mobile-provision',
                Accept: 'application/vnd.github+json',
                ...(process.env.GITHUB_TOKEN ? {Authorization: `Bearer ${process.env.GITHUB_TOKEN}`} : {}),
            },
            timeout: 30_000,
        }, (res) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                if ((res.statusCode || 0) >= 400) {
                    reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
                    return;
                }

                try {
                    const parsed = JSON.parse(data) as GitHubLatestRelease;
                    if (!parsed.tag_name) {
                        reject(new Error(`GitHub API response missing tag_name: ${data.slice(0, 200)}`));
                        return;
                    }

                    const tag = parsed.tag_name;
                    resolve(tag.startsWith('v') ? tag.slice(1) : tag);
                } catch (err) {
                    reject(err instanceof Error ? err : new Error(String(err)));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request to GitHub releases/latest timed out for ${repo}`));
        });
        req.end();
    });
}

function buildPluginDownloadUrl(repo: string, assetName: string, version: string): string {
    return `https://github.com/${repo}/releases/download/v${version}/${assetName}-v${version}-linux-amd64.tar.gz`;
}

async function resolveAgentsPluginUrl(): Promise<string> {
    const override = getAgentsPluginDownloadUrl();
    if (override) {
        return override;
    }

    try {
        const version = await fetchLatestPluginVersion(AGENTS_PLUGIN_REPO);
        logInfo(`${AGENTS_PLUGIN_REPO}: latest=v${version}`);
        return buildPluginDownloadUrl(AGENTS_PLUGIN_REPO, AGENTS_PLUGIN_ASSET_NAME, version);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logWarn(`${AGENTS_PLUGIN_REPO}: GitHub API lookup failed (${message}); falling back to v${AGENTS_PLUGIN_FALLBACK_VERSION}.`);
        return buildPluginDownloadUrl(AGENTS_PLUGIN_REPO, AGENTS_PLUGIN_ASSET_NAME, AGENTS_PLUGIN_FALLBACK_VERSION);
    }
}

async function getPluginStatus(client: MattermostClient, token: string, pluginId: string): Promise<PluginStatus | null> {
    const res = await client.request<PluginStatus[]>('GET', '/api/v4/plugins/statuses', undefined, token);
    if (res.status >= 400 || !Array.isArray(res.data)) {
        return null;
    }

    return res.data.find((plugin) => plugin.plugin_id === pluginId) || null;
}

async function installPluginFromUrl(
    client: MattermostClient,
    token: string,
    pluginId: string,
    pluginUrl: string,
    {force = false}: {force?: boolean} = {},
): Promise<PluginInstallResult> {
    const forceParam = force ? '&force=true' : '';
    const installRes = await client.request<ApiErrorBody>(
        'POST',
        `/api/v4/plugins/install_from_url?plugin_download_url=${encodeURIComponent(pluginUrl)}${forceParam}`,
        undefined,
        token,
    );

    if (installRes.status >= 400) {
        return {
            ok: false,
            status: installRes.status,
            message: installRes.data.message || JSON.stringify(installRes.data),
        };
    }

    const enableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
    if (enableRes.status >= 400) {
        return {
            ok: false,
            status: enableRes.status,
            message: enableRes.data.message || JSON.stringify(enableRes.data),
        };
    }

    await sleep(3000);
    return {ok: true};
}

async function installAgentsPluginFromMarketplace(client: MattermostClient, token: string): Promise<boolean> {
    logInfo(`Installing ${AGENTS_PLUGIN_ID} from Marketplace...`);
    const installRes = await client.request<ApiErrorBody>('POST', '/api/v4/plugins/marketplace', {id: AGENTS_PLUGIN_ID}, token);
    if (installRes.status >= 400) {
        logWarn(`Marketplace install failed for ${AGENTS_PLUGIN_ID} (HTTP ${installRes.status}): ${installRes.data.message || JSON.stringify(installRes.data)}`);
        return false;
    }

    const enableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(AGENTS_PLUGIN_ID)}/enable`, {}, token);
    if (enableRes.status >= 400) {
        logWarn(`Failed to enable ${AGENTS_PLUGIN_ID} after Marketplace install (HTTP ${enableRes.status}): ${enableRes.data.message || JSON.stringify(enableRes.data)}`);
        return false;
    }

    await sleep(3000);
    return true;
}

export async function ensureAgentsPlugin(client: MattermostClient, token: string): Promise<boolean> {
    const pluginsRes = await client.request<PluginsPayload>('GET', '/api/v4/plugins', undefined, token);
    const status = await getPluginStatus(client, token, AGENTS_PLUGIN_ID);
    const isActive = pluginsRes.data?.active?.some((plugin) => plugin.id === AGENTS_PLUGIN_ID);
    const isFailed = status?.state === PLUGIN_STATE_FAILED;

    if (isActive && !isFailed && status?.state === PLUGIN_STATE_RUNNING) {
        logInfo(`Plugin ${AGENTS_PLUGIN_ID} is already installed and running (${status.version}).`);
        return true;
    }

    if (isFailed) {
        logWarn(`Plugin ${AGENTS_PLUGIN_ID} is in failed state: ${status?.error || 'unknown error'}`);
    }

    const pluginUrl = await resolveAgentsPluginUrl();
    logInfo(`Installing ${AGENTS_PLUGIN_ID} from URL...`);
    const installResult = await installPluginFromUrl(client, token, AGENTS_PLUGIN_ID, pluginUrl, {force: true});
    if (installResult.ok) {
        const postStatus = await getPluginStatus(client, token, AGENTS_PLUGIN_ID);
        if (postStatus?.state !== PLUGIN_STATE_FAILED) {
            logInfo(`Plugin ${AGENTS_PLUGIN_ID} installed (${postStatus?.version || 'unknown version'}).`);
            return true;
        }
        logWarn(`Plugin ${AGENTS_PLUGIN_ID} failed after URL install: ${postStatus?.error}`);
    } else {
        logWarn(`URL install failed for ${AGENTS_PLUGIN_ID} (HTTP ${installResult.status}): ${installResult.message}`);
    }

    if (await installAgentsPluginFromMarketplace(client, token)) {
        const postStatus = await getPluginStatus(client, token, AGENTS_PLUGIN_ID);
        if (postStatus?.state !== PLUGIN_STATE_FAILED) {
            logInfo(`Plugin ${AGENTS_PLUGIN_ID} installed from Marketplace (${postStatus?.version || 'unknown version'}).`);
            return true;
        }
        logWarn(`Plugin ${AGENTS_PLUGIN_ID} failed after Marketplace install: ${postStatus?.error}`);
    }

    logWarn('Could not install a compatible mattermost-ai plugin build.');
    return false;
}

async function installPluginFromFile(
    client: MattermostClient,
    token: string,
    pluginId: string,
    filePath: string,
    {force = false}: {force?: boolean} = {},
): Promise<PluginInstallResult> {
    const fs = await import('node:fs');

    if (!fs.existsSync(filePath)) {
        return {
            ok: false,
            status: 0,
            message: `Plugin fixture not found: ${filePath}`,
        };
    }

    let res: Awaited<ReturnType<typeof uploadMultipartFile<ApiErrorBody>>>;
    try {
        res = await uploadMultipartFile<ApiErrorBody>(
            client,
            'POST',
            `/api/v4/plugins${force ? '?force=true' : ''}`,
            filePath,
            'plugin',
            token,
        );
    } catch (err) {
        return {
            ok: false,
            status: 0,
            message: err instanceof Error ? err.message : String(err),
        };
    }

    if (res.status >= 400) {
        return {
            ok: false,
            status: res.status,
            message: res.data.message || JSON.stringify(res.data),
        };
    }

    const enableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token).catch((err: unknown) => ({
        data: {message: err instanceof Error ? err.message : String(err)},
        status: 0,
        headers: {},
    }));
    if (enableRes.status === 0 || enableRes.status >= 400) {
        return {
            ok: false,
            status: enableRes.status,
            message: enableRes.data.message || JSON.stringify(enableRes.data),
        };
    }

    await sleep(3000);
    return {ok: true};
}

export async function installRequiredPlugin(
    client: MattermostClient,
    token: string,
    {id: pluginId, url: pluginUrl, fixture: fixtureFilename}: RequiredPlugin,
): Promise<void> {
    const pluginsRes = await client.request<PluginsPayload>('GET', '/api/v4/plugins', undefined, token);
    if (pluginsRes.status >= 400) {
        logWarn(`Could not list plugins: ${(pluginsRes.data as ApiErrorBody).message || ''}`);
        return;
    }

    const {active = [], inactive = []} = pluginsRes.data;
    const isActive = active.some((p: PluginListEntry) => p.id === pluginId);
    const isInactive = inactive.some((p: PluginListEntry) => p.id === pluginId);

    if (isActive) {
        logInfo(`Plugin ${pluginId} is already installed and active.`);
        return;
    }

    if (isInactive) {
        logInfo(`Plugin ${pluginId} is installed but inactive, enabling...`);
        // ponytail: .catch — a transient enable timeout (e.g. demo-plugin on a
        // freshly-provisioned server) must not crash the whole provision run.
        // Other enable sites below already swallow this; this one didn't.
        const enableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token).catch((err: unknown) => ({
            data: {message: err instanceof Error ? err.message : String(err)} as ApiErrorBody,
            status: 0,
            headers: {},
        }));
        if (enableRes.status === 0 || enableRes.status >= 400) {
            logWarn(`Failed to enable ${pluginId} (HTTP ${enableRes.status}): ${enableRes.data.message || JSON.stringify(enableRes.data)}`);
        } else {
            logInfo(`Plugin ${pluginId} enabled.`);
        }
        return;
    }

    if (fixtureFilename) {
        const fixturePath = path.resolve(__dirname, `../e2e/support/fixtures/${fixtureFilename}`);
        logInfo(`Installing ${pluginId} from fixture: ${fixturePath}`);
        const installResult = await installPluginFromFile(client, token, pluginId, fixturePath, {force: true});
        if (installResult.ok) {
            logInfo(`Plugin ${pluginId} installed and enabled from fixture.`);
            return;
        }
        logWarn(`Fixture install failed for ${pluginId}: ${installResult.message}`);
    }

    if (pluginUrl) {
        logInfo(`Installing ${pluginId} from URL: ${pluginUrl}`);
        const installResult = await installPluginFromUrl(client, token, pluginId, pluginUrl, {force: true});
        if (installResult.ok) {
            logInfo(`Plugin ${pluginId} installed and enabled from URL.`);
            return;
        }
        logWarn(`URL install failed for ${pluginId} (HTTP ${installResult.status}): ${installResult.message}`);
    }

    logInfo(`Installing ${pluginId} from Marketplace...`);
    const installRes = await client.request<ApiErrorBody>('POST', '/api/v4/plugins/marketplace', {id: pluginId}, token);
    if (installRes.status >= 400) {
        logWarn(`Marketplace install failed for ${pluginId} (HTTP ${installRes.status}): ${installRes.data.message || JSON.stringify(installRes.data)}`);
        return;
    }

    logInfo(`Enabling ${pluginId}...`);
    const postInstallEnableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
    if (postInstallEnableRes.status >= 400) {
        logWarn(`Failed to enable ${pluginId} after install (HTTP ${postInstallEnableRes.status}): ${postInstallEnableRes.data.message || JSON.stringify(postInstallEnableRes.data)}`);
    } else {
        logInfo(`Plugin ${pluginId} installed and enabled from Marketplace.`);
    }
}
