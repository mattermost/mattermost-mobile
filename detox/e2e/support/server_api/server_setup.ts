// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-console */

import fs from 'fs';

import FormData from 'form-data';

import {PLUGIN_STATE_FAILED, PLUGIN_STATE_RUNNING} from '../../../provision/constants';
import {demoPluginSettingsPatch} from '../../../provision/plugins';
import {DEMO_PLUGIN_VERSION, ensureDemoPluginFixture} from '../../../shared/demo-plugin-fixture';

import client from './client';
import {getResponseFromError} from './common';
import CustomProfileAttributes from './custom_profile_attributes';
import {AgentsPlugin, CallsPlugin, DemoPlugin, apiEnablePluginById, apiGetPluginStatus, apiInstallPluginFromMarketplace} from './plugin';
import {apiGetConfig, apiUpdateConfig} from './system';
import User from './user';

// Idempotent server setup a spec calls in its beforeAll for what it needs beyond the baseline. Each helper only reads
// when the server is already right, so it is cheap to call from every spec that needs it.

const PLUGIN_POLL_MS = 1_000;
const PLUGIN_RUNNING_TIMEOUT_MS = 60_000;

/** beforeAll timeout for a spec that calls ensureDemoPlugin: a first install downloads, uploads and starts it. */
export const DEMO_PLUGIN_SETUP_TIMEOUT = 480_000;

type PluginStatus = {plugin_id: string; state: number; error?: string; version?: string};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const adminLogin = async (baseUrl: string) => {
    const {error} = await User.apiAdminLogin(baseUrl);
    if (error) {
        throw new Error(`server setup: admin login failed on ${baseUrl}: ${error.message ?? JSON.stringify(error)}`);
    }
};

const getPluginStatus = async (baseUrl: string, pluginId: string): Promise<PluginStatus | undefined> => {
    try {
        const response = await client.get<PluginStatus[]>(`${baseUrl}/api/v4/plugins/statuses`);
        return response.data.find((status) => status.plugin_id === pluginId);
    } catch (err) {
        const {status} = getResponseFromError(err);
        throw new Error(`server setup: could not read plugin statuses (HTTP ${status})`);
    }
};

const waitForPluginRunning = async (baseUrl: string, pluginId: string, timeoutMs = PLUGIN_RUNNING_TIMEOUT_MS) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const status = await getPluginStatus(baseUrl, pluginId);
        if (status?.state === PLUGIN_STATE_RUNNING) {
            return;
        }
        if (status?.state === PLUGIN_STATE_FAILED) {
            throw new Error(`Plugin ${pluginId} failed to start: ${status.error || 'unknown error'}`);
        }
        if (Date.now() >= deadline) {
            throw new Error(`Plugin ${pluginId} is not running after ${timeoutMs / 1000}s (state ${status?.state ?? 'unknown'})`);
        }
        await sleep(PLUGIN_POLL_MS);
    }
};

const enablePlugin = async (baseUrl: string, pluginId: string) => {
    const result = await apiEnablePluginById(baseUrl, pluginId);
    if (result.error) {
        throw new Error(`Could not enable plugin ${pluginId}: ${result.error.message ?? JSON.stringify(result.error)}`);
    }
    await waitForPluginRunning(baseUrl, pluginId);
};

/**
 * Ensures an installed plugin, such as a prepackaged one, is running: enables it when it is not. A plugin the server
 * does not have is never installed here.
 * @param {string} baseUrl - the base server URL
 * @param {string} pluginId - the plugin ID
 */
export const ensurePluginEnabled = async (baseUrl: string, pluginId: string): Promise<void> => {
    await adminLogin(baseUrl);
    const status = await getPluginStatus(baseUrl, pluginId);
    if (status?.state === PLUGIN_STATE_RUNNING) {
        return;
    }
    if (!status) {
        throw new Error(`Plugin ${pluginId} is not installed on ${baseUrl}`);
    }
    console.info(`[server setup] enabling ${pluginId}`);
    await enablePlugin(baseUrl, pluginId);
};

/** Ensures the prepackaged Calls plugin is running. */
export const ensureCallsPlugin = (baseUrl: string): Promise<void> => ensurePluginEnabled(baseUrl, CallsPlugin.id);

/**
 * Ensures the Agents plugin is running: enables it when installed, and locally installs it from the Marketplace when
 * missing. Agents specs skip when it cannot run, so a failure is reported, not thrown.
 * @param {string} baseUrl - the base server URL
 * @return {boolean} whether the plugin is running
 */
export const ensureAgentsPlugin = async (baseUrl: string): Promise<boolean> => {
    try {
        await adminLogin(baseUrl);
        const status = await getPluginStatus(baseUrl, AgentsPlugin.id);
        if (status?.state === PLUGIN_STATE_RUNNING) {
            return true;
        }
        if (!status) {
            console.info(`[server setup] installing ${AgentsPlugin.id} from the Marketplace`);
            const installed = await apiInstallPluginFromMarketplace(baseUrl, AgentsPlugin.id);
            if (installed.error) {
                throw new Error(`Marketplace install failed: ${installed.error.message ?? JSON.stringify(installed.error)}`);
            }
        }
        await enablePlugin(baseUrl, AgentsPlugin.id);
        return true;
    } catch (error) {
        console.warn(`[server setup] ${AgentsPlugin.id} is not available: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
};

/** DialogOnlyMode keeps the demo plugin to /dialog: no demo user, channels or posts (see demoPluginSettingsPatch). */
const ensureDemoPluginSettings = async (baseUrl: string) => {
    const {config, error} = await apiGetConfig(baseUrl);
    if (error) {
        throw new Error(`Could not read config for the ${DemoPlugin.id} settings: ${error.message ?? JSON.stringify(error)}`);
    }
    const settings = demoPluginSettingsPatch(config?.PluginSettings?.Plugins?.[DemoPlugin.id] ?? {});
    if (!settings) {
        return;
    }

    // Only the plugin's own Plugins entry: a PluginStates patch would replace the whole map.
    const result = await apiUpdateConfig(baseUrl, {PluginSettings: {Plugins: {[DemoPlugin.id]: settings}}});
    if (result.error) {
        throw new Error(`Could not set the ${DemoPlugin.id} settings: ${result.error.message ?? JSON.stringify(result.error)}`);
    }
};

const uploadDemoPlugin = async (baseUrl: string) => {
    const fixturePath = await ensureDemoPluginFixture();
    const form = new FormData();
    form.append('plugin', fs.createReadStream(fixturePath));

    // The server reads force from the form, not the query string.
    form.append('force', 'true');
    try {
        await client.post(`${baseUrl}/api/v4/plugins`, form, {headers: form.getHeaders(), maxBodyLength: Infinity});
    } catch (err) {
        const {error, status} = getResponseFromError(err);
        throw new Error(`Could not upload ${DemoPlugin.id} (HTTP ${status}): ${error?.message ?? JSON.stringify(error)}`);
    }
};

/**
 * Ensures the demo plugin runs at the pinned version in DialogOnlyMode, uploading it from the runner's fixture when
 * missing or stale (never install_from_url, which 524s behind Cloudflare). Callers wait for /dialog on their team.
 * @param {string} baseUrl - the base server URL
 */
export const ensureDemoPlugin = async (baseUrl: string): Promise<void> => {
    await adminLogin(baseUrl);

    // Before install or enable: an older build without its settings entry resets other settings on config saves.
    await ensureDemoPluginSettings(baseUrl);

    const status = await apiGetPluginStatus(baseUrl, DemoPlugin.id);
    if (status.error) {
        throw new Error(`Could not list plugins: ${status.error.message ?? JSON.stringify(status.error)}`);
    }
    const current = status.isInstalled && status.plugin?.version === DEMO_PLUGIN_VERSION;
    if (current && status.isActive) {
        await waitForPluginRunning(baseUrl, DemoPlugin.id);
        return;
    }
    if (!current) {
        console.info(`[server setup] uploading ${DemoPlugin.id} ${DEMO_PLUGIN_VERSION} (installed: ${status.plugin?.version ?? 'none'})`);
        await uploadDemoPlugin(baseUrl);
    }
    await enablePlugin(baseUrl, DemoPlugin.id);
};

/**
 * Ensures custom profile attribute fields with these names exist, creating the missing ones as text fields.
 * @param {string} baseUrl - the base server URL
 * @param {string[]} names - the field names
 * @return {string|undefined} why the fields are not ready, or undefined when they are
 */
export const ensureCustomProfileAttributeFields = async (baseUrl: string, names: readonly string[]): Promise<string | undefined> => {
    await adminLogin(baseUrl);
    const {fields, error} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(baseUrl);
    if (error) {
        return `Could not list custom profile fields: ${error.message ?? JSON.stringify(error)}`;
    }
    const existing = new Set((fields as Array<{name?: string}> | undefined ?? []).map((field) => field.name));
    for (const name of names.filter((fieldName) => !existing.has(fieldName))) {
        const {error: createError} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(baseUrl, {name});
        if (createError) {
            return `Could not create custom profile field "${name}": ${createError.message ?? JSON.stringify(createError)}`;
        }
    }
    return undefined;
};

export const ServerSetup = {
    ensureAgentsPlugin,
    ensureCallsPlugin,
    ensureCustomProfileAttributeFields,
    ensureDemoPlugin,
    ensurePluginEnabled,
};

export default ServerSetup;
