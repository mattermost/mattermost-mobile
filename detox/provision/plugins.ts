// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'node:path';

import {
    AGENTS_PLUGIN_ID,
    LOADTEST_MOCK_MIN_MM_VERSION,
    PLUGIN_STATE_FAILED,
    PLUGIN_STATE_RUNNING,
} from './constants';
import {getLatestMasterPluginUrl, resolveAgentsPluginCandidates} from './github-releases';
import {sleep} from './http-client';
import {logInfo, logWarn} from './log';
import {semverGte} from './semver';

import type {
    MattermostClient,
    PluginInstallResult,
    PluginListEntry,
    PluginReleaseCandidate,
    PluginStatus,
    PluginsPayload,
    RequiredPlugin,
} from './types';

type ApiErrorBody = {message?: string};

export async function getPluginStatus(client: MattermostClient, token: string, pluginId: string): Promise<PluginStatus | null> {
    const res = await client.request<PluginStatus[]>('GET', '/api/v4/plugins/statuses', undefined, token);
    if (res.status >= 400 || !Array.isArray(res.data)) {
        return null;
    }

    return res.data.find((plugin) => plugin.plugin_id === pluginId) || null;
}

export async function installPluginFromUrl(
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

function toCandidateList(candidates: PluginReleaseCandidate[] | string): PluginReleaseCandidate[] {
    if (typeof candidates === 'string') {
        return [{tag: 'override', url: candidates}];
    }
    return candidates;
}

export async function ensureAgentsPlugin(
    client: MattermostClient,
    token: string,
    serverMmVersion: string,
    {requireLatestMaster = false}: {requireLatestMaster?: boolean} = {},
): Promise<boolean> {
    if (requireLatestMaster && semverGte(serverMmVersion, LOADTEST_MOCK_MIN_MM_VERSION)) {
        const masterUrl = await getLatestMasterPluginUrl();
        if (masterUrl) {
            logInfo('Installing latest-master mattermost-ai for E2E mock LLM...');
            const installResult = await installPluginFromUrl(client, token, AGENTS_PLUGIN_ID, masterUrl, {force: true});
            if (installResult.ok) {
                const postStatus = await getPluginStatus(client, token, AGENTS_PLUGIN_ID);
                if (postStatus?.state !== PLUGIN_STATE_FAILED) {
                    logInfo(`Plugin ${AGENTS_PLUGIN_ID} ready (${postStatus?.version || 'unknown version'}).`);
                    return true;
                }
                logWarn(`latest-master install failed to start: ${postStatus?.error}`);
            } else {
                logWarn(`latest-master install failed (HTTP ${installResult.status}): ${installResult.message}`);
            }
        }
    }

    const candidates = await resolveAgentsPluginCandidates(serverMmVersion);
    const candidateList = toCandidateList(candidates);

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

    for (const candidate of candidateList) {
        logInfo(`Installing ${AGENTS_PLUGIN_ID} from ${candidate.tag}: ${candidate.url}`);
        /* eslint-disable no-await-in-loop -- try release candidates sequentially until one installs */
        const installResult = await installPluginFromUrl(client, token, AGENTS_PLUGIN_ID, candidate.url, {force: true});
        if (!installResult.ok) {
            logWarn(`Install from ${candidate.tag} failed (HTTP ${installResult.status}): ${installResult.message}`);
            continue;
        }

        const postStatus = await getPluginStatus(client, token, AGENTS_PLUGIN_ID);
        /* eslint-enable no-await-in-loop */
        if (postStatus?.state === PLUGIN_STATE_FAILED) {
            logWarn(`Plugin ${AGENTS_PLUGIN_ID} failed after ${candidate.tag} install: ${postStatus.error}`);
            continue;
        }

        logInfo(`Plugin ${AGENTS_PLUGIN_ID} installed from ${candidate.tag} (${postStatus?.version || 'unknown version'}).`);
        return true;
    }

    logWarn('Could not install a compatible mattermost-ai plugin build.');
    return false;
}

export async function installPluginFromFile(
    client: MattermostClient,
    token: string,
    pluginId: string,
    filePath: string,
    {force = false}: {force?: boolean} = {},
): Promise<PluginInstallResult> {
    const fs = await import('node:fs');
    const nodePath = await import('node:path');

    if (!fs.existsSync(filePath)) {
        return {
            ok: false,
            status: 0,
            message: `Plugin fixture not found: ${filePath}`,
        };
    }

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('plugin', fs.createReadStream(filePath), nodePath.basename(filePath));
    form.append('force', String(force));

    const res = await client.request<ApiErrorBody>('POST', '/api/v4/plugins', form as unknown as Record<string, unknown>, token);
    if (res.status >= 400) {
        return {
            ok: false,
            status: res.status,
            message: res.data.message || JSON.stringify(res.data),
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
        const enableRes = await client.request<ApiErrorBody>('POST', `/api/v4/plugins/${encodeURIComponent(pluginId)}/enable`, {}, token);
        if (enableRes.status >= 400) {
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
