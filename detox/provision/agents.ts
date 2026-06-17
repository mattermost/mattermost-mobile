// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    AGENTS_PLUGIN_ID,
    E2E_AGENT_USERNAME,
    E2E_MOCK_SERVICE_ID,
    LOADTEST_MOCK_MIN_MM_VERSION,
} from './constants';
import {shouldUseLoadtestMock} from './env';
import {getLatestMasterPluginUrl} from './github-releases';
import {sleep} from './http-client';
import {logInfo, logWarn} from './log';
import {installPluginFromUrl} from './plugins';
import {semverGte} from './semver';

import type {
    AgentsPluginAgent,
    AgentsPluginService,
    MattermostClient,
    PluginsPayload,
} from './types';

type ApiErrorBody = {message?: string};

export function isAgentsPluginActive(pluginsPayload: PluginsPayload): boolean {
    const {active = []} = pluginsPayload;
    return active.some((plugin) => plugin.id === AGENTS_PLUGIN_ID);
}

export async function getAgentsPluginServices(client: MattermostClient, token: string): Promise<AgentsPluginService[] | null> {
    const res = await client.request<AgentsPluginService[]>('GET', '/plugins/mattermost-ai/services', undefined, token);
    if (res.status >= 400 || !Array.isArray(res.data) || res.data.length === 0) {
        return null;
    }

    return res.data;
}

async function listAgentsPluginAgents(client: MattermostClient, token: string): Promise<AgentsPluginAgent[]> {
    const res = await client.request<AgentsPluginAgent[]>('GET', '/plugins/mattermost-ai/agents', undefined, token);
    if (res.status >= 400 || !Array.isArray(res.data)) {
        return [];
    }

    return res.data;
}

async function getPluginAdminConfig(client: MattermostClient, token: string): Promise<Record<string, unknown>> {
    const res = await client.request<Record<string, unknown>>('GET', '/plugins/mattermost-ai/admin/config', undefined, token);
    if (res.status >= 400 || !res.data || typeof res.data !== 'object') {
        return {};
    }

    return res.data;
}

async function putPluginAdminConfig(
    client: MattermostClient,
    token: string,
    config: Record<string, unknown>,
): Promise<boolean> {
    const res = await client.request<ApiErrorBody>('PUT', '/plugins/mattermost-ai/admin/config', config, token);
    if (res.status >= 400) {
        logWarn(`Plugin admin config update failed (HTTP ${res.status}): ${res.data?.message || JSON.stringify(res.data)}`);
        return false;
    }

    await sleep(2000);
    return true;
}

async function configureLoadtestMockService(client: MattermostClient, token: string): Promise<boolean> {
    const existing = await getPluginAdminConfig(client, token);
    const updated = await putPluginAdminConfig(client, token, {
        ...existing,
        services: [{
            id: E2E_MOCK_SERVICE_ID,
            name: 'E2E Mock LLM',
            type: 'loadtest_mock',
        }],
        defaultBotName: E2E_AGENT_USERNAME,
        bots: Array.isArray(existing.bots) ? existing.bots : [],
    });

    if (!updated) {
        return false;
    }

    logInfo('Configured loadtest_mock service via plugin admin config API.');
    return true;
}

async function createAgentsPluginAgent(client: MattermostClient, token: string, serviceId: string): Promise<boolean> {
    const res = await client.request<ApiErrorBody>('POST', '/plugins/mattermost-ai/agents', {
        displayName: 'E2E Agent',
        username: E2E_AGENT_USERNAME,
        serviceID: serviceId,
        customInstructions: 'You are a helpful E2E test agent.',
        channelAccessLevel: 0,
        userAccessLevel: 0,
        autoEnableNewMCPTools: true,
    }, token);

    if (res.status === 201) {
        logInfo(`Created E2E agent bot "${E2E_AGENT_USERNAME}" (service ${serviceId}).`);
        return true;
    }

    if (res.status === 409) {
        logInfo(`E2E agent bot "${E2E_AGENT_USERNAME}" already exists.`);
        return true;
    }

    logWarn(`Failed to create E2E agent bot (HTTP ${res.status}): ${res.data?.message || JSON.stringify(res.data)}`);
    return false;
}

async function ensureLoadtestMockServices(
    client: MattermostClient,
    token: string,
    serverMmVersion: string,
): Promise<AgentsPluginService[] | null> {
    if (!shouldUseLoadtestMock()) {
        return null;
    }

    if (!semverGte(serverMmVersion, LOADTEST_MOCK_MIN_MM_VERSION)) {
        logWarn(`loadtest_mock requires Mattermost >= ${LOADTEST_MOCK_MIN_MM_VERSION} (server is ${serverMmVersion}).`);
        return null;
    }

    const masterUrl = await getLatestMasterPluginUrl();
    if (masterUrl) {
        logInfo('No LLM services — upgrading to latest-master for loadtest_mock...');
        const upgrade = await installPluginFromUrl(client, token, AGENTS_PLUGIN_ID, masterUrl, {force: true});
        if (!upgrade.ok) {
            logWarn(`latest-master upgrade failed: ${upgrade.message}`);
        }
    }

    logInfo('Attempting loadtest_mock fallback...');
    const configured = await configureLoadtestMockService(client, token);
    if (!configured) {
        return null;
    }

    return getAgentsPluginServices(client, token);
}

export async function ensureAgentsE2EBot(
    client: MattermostClient,
    token: string,
    serverMmVersion: string,
): Promise<void> {
    const pluginsRes = await client.request<PluginsPayload>('GET', '/api/v4/plugins', undefined, token);
    if (pluginsRes.status >= 400) {
        logWarn('Could not list plugins for agents setup.');
        return;
    }

    if (!isAgentsPluginActive(pluginsRes.data)) {
        logWarn(`${AGENTS_PLUGIN_ID} is not active — skipping E2E agent setup.`);
        return;
    }

    let services = await getAgentsPluginServices(client, token);
    if (!services) {
        services = await ensureLoadtestMockServices(client, token, serverMmVersion);
    }

    if (!services) {
        logWarn('No LLM services from /plugins/mattermost-ai/services — skipping E2E agent setup.');
        return;
    }

    const service = services[0];
    if (!service) {
        logWarn('No LLM service entry available — skipping E2E agent setup.');
        return;
    }

    logInfo(`Using agents LLM service "${service.name}" (${service.type}, ${service.id}).`);

    const agents = await listAgentsPluginAgents(client, token);
    if (agents.some((agent) => agent.name === E2E_AGENT_USERNAME)) {
        logInfo(`E2E agent bot "${E2E_AGENT_USERNAME}" is already configured.`);
        return;
    }

    await createAgentsPluginAgent(client, token, service.id);
}

type AgentsStatusResponse = {available?: boolean};

export async function verifyAgentsSetup(client: MattermostClient, token: string): Promise<boolean> {
    const statusRes = await client.request<AgentsStatusResponse>('GET', '/api/v4/agents/status', undefined, token);
    const services = await getAgentsPluginServices(client, token);
    const pluginAgents = await listAgentsPluginAgents(client, token);
    const botsRes = await client.request<Array<{username?: string; delete_at?: number}>>('GET', '/api/v4/bots', undefined, token);
    const agentBot = Array.isArray(botsRes.data) ?
        botsRes.data.find((b) => b.username === E2E_AGENT_USERNAME && b.delete_at === 0) :
        null;

    logInfo(`agents/status -> ${statusRes.status} ${JSON.stringify(statusRes.data)}`);
    logInfo(`plugin services -> ${services?.length ?? 0}`);
    logInfo(`plugin agents -> ${pluginAgents.length} ${pluginAgents.map((a) => a.name).join(', ')}`);
    logInfo(`bot user -> ${agentBot ? agentBot.username : 'missing'}`);

    return statusRes.data?.available === true &&
        Boolean(services?.length) &&
        pluginAgents.some((a) => a.name === E2E_AGENT_USERNAME) &&
        Boolean(agentBot);
}
