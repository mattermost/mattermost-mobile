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
    DEMO_PLUGIN_ID,
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
type SlashCommand = {trigger?: string};
type Team = {id: string};

const DEMO_PLUGIN_READY_TIMEOUT_MS = 60_000;
const DEMO_PLUGIN_POLL_INTERVAL_MS = 1_000;

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

function failDemoPluginReadiness(message: string): never {
    logWarn(message);
    throw new Error(message);
}

async function waitForDemoPluginRunning(client: MattermostClient, token: string): Promise<void> {
    const deadline = Date.now() + DEMO_PLUGIN_READY_TIMEOUT_MS;
    let lastStatus: PluginStatus | null = null;

    const poll = async (): Promise<void> => {
        lastStatus = await getPluginStatus(client, token, DEMO_PLUGIN_ID);
        if (lastStatus?.state === PLUGIN_STATE_RUNNING) {
            return;
        }

        if (Date.now() >= deadline) {
            let detail = 'status unavailable';
            if (lastStatus) {
                detail = `state=${lastStatus.state}${lastStatus.error ? `, error=${lastStatus.error}` : ''}`;
            }
            failDemoPluginReadiness(`Demo plugin did not reach running state (${PLUGIN_STATE_RUNNING}) within ${DEMO_PLUGIN_READY_TIMEOUT_MS}ms: ${detail}`);
        }

        await sleep(DEMO_PLUGIN_POLL_INTERVAL_MS);
        await poll();
    };

    await poll();
    logInfo(`Plugin ${DEMO_PLUGIN_ID} is running.`);
}

async function getCommandVerificationTeamId(client: MattermostClient, token: string): Promise<string> {
    const teamsRes = await client.request<Team[]>('GET', '/api/v4/teams?page=0&per_page=1', undefined, token);
    if (teamsRes.status < 400 && Array.isArray(teamsRes.data) && teamsRes.data[0]?.id) {
        return teamsRes.data[0].id;
    }

    const suffix = Date.now().toString(36);
    const createRes = await client.request<Team | ApiErrorBody>('POST', '/api/v4/teams', {
        name: `e2e-provision-${suffix}`,
        display_name: `E2E Provision ${suffix}`,
        type: 'O',
    }, token);
    const createdTeam = createRes.data as Team;
    if (createRes.status >= 400 || !createdTeam.id) {
        const error = createRes.data as ApiErrorBody;
        failDemoPluginReadiness(`Could not get or create a team for /dialog verification (HTTP ${createRes.status}): ${error.message || JSON.stringify(createRes.data)}`);
    }

    return createdTeam.id;
}

async function waitForDialogCommand(client: MattermostClient, token: string, teamId: string): Promise<void> {
    const deadline = Date.now() + DEMO_PLUGIN_READY_TIMEOUT_MS;
    let lastError = '';

    const poll = async (): Promise<void> => {
        const commandsRes = await client.request<SlashCommand[]>('GET', `/api/v4/commands?team_id=${encodeURIComponent(teamId)}`, undefined, token);
        let commandCount = 0;
        if (commandsRes.status < 400 && Array.isArray(commandsRes.data)) {
            if (commandsRes.data.some((command) => command.trigger === 'dialog')) {
                return;
            }
            commandCount += commandsRes.data.length;
        } else {
            lastError = `HTTP ${commandsRes.status}: ${(commandsRes.data as ApiErrorBody).message || JSON.stringify(commandsRes.data)}`;
        }

        const autocompleteRes = await client.request<SlashCommand[]>(
            'GET',
            `/api/v4/teams/${encodeURIComponent(teamId)}/commands/autocomplete?page=0&per_page=200`,
            undefined,
            token,
        );
        if (autocompleteRes.status < 400 && Array.isArray(autocompleteRes.data)) {
            if (autocompleteRes.data.some((command) => command.trigger === 'dialog')) {
                return;
            }
            commandCount += autocompleteRes.data.length;
            lastError = `${commandCount} commands returned across command APIs`;
        } else {
            lastError = `Autocomplete HTTP ${autocompleteRes.status}: ${(autocompleteRes.data as ApiErrorBody).message || JSON.stringify(autocompleteRes.data)}`;
        }

        if (Date.now() >= deadline) {
            failDemoPluginReadiness(`/dialog was not registered within ${DEMO_PLUGIN_READY_TIMEOUT_MS}ms after ${DEMO_PLUGIN_ID} started (${lastError}).`);
        }

        await sleep(DEMO_PLUGIN_POLL_INTERVAL_MS);
        await poll();
    };

    await poll();
    logInfo('/dialog command is registered.');
}

export async function ensureDemoPluginReady(client: MattermostClient, token: string): Promise<void> {
    await waitForDemoPluginRunning(client, token);
    const teamId = await getCommandVerificationTeamId(client, token);
    await waitForDialogCommand(client, token, teamId);
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
        // CI downloads the fixture; local runs fall back to the pinned URL when it is absent.
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

    // ponytail: .catch — same transient-enable-timeout guard as the inactive branch above.
    const postInstallEnableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token).catch((err: unknown) => ({
        data: {message: err instanceof Error ? err.message : String(err)} as ApiErrorBody,
        status: 0,
        headers: {},
    }));
    if (postInstallEnableRes.status === 0 || postInstallEnableRes.status >= 400) {
        logWarn(`Failed to enable ${pluginId} after install (HTTP ${postInstallEnableRes.status}): ${postInstallEnableRes.data.message || JSON.stringify(postInstallEnableRes.data)}`);
    } else {
        logInfo(`Plugin ${pluginId} installed and enabled from Marketplace.`);
    }
}
