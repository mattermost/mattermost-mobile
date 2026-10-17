// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    applyBaseline,
    type BaselineTransport,
    CONFIG_BASELINE,
    FEATURE_FLAG_BASELINE,
    inspectBaselineKeys,
    isBaselineKey,
    parseConfigPath,
    verifyBaseline,
} from './server-baseline';

type JsonRecord = Record<string, any>;
type Call = {method: string; path: string; body?: JsonRecord};

const SERVER_URL = 'https://site.example.test';
const MAP_FIELDS = ['PluginStates'];

/** What GET /api/v4/config returns in place of secret settings. */
const REDACTED = '*'.repeat(32);

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A server that has never been provisioned: every baseline value is wrong or absent. */
const freshConfig = (): JsonRecord => ({
    ServiceSettings: {
        SiteURL: SERVER_URL,
        CollapsedThreads: 'default_off',
        ThreadAutoFollow: false,
        EnableCrossTeamSearch: false,
        ScheduledPosts: false,
        EnablePostUsernameOverride: false,
        EnableGifPicker: false,
        AllowCorsFrom: '',
        AllowedUntrustedInternalConnections: 'example.com',
        EnableMultifactorAuthentication: true,
    },
    FileSettings: {
        MaxFileSize: 1,
        EnablePublicLink: false,
        EnableFileAttachments: false,
        EnableMobileUpload: false,
        EnableMobileDownload: false,
    },
    SupportSettings: {
        AllowDownloadLogs: false,
        CustomTermsOfServiceEnabled: true,
        ReportAProblemMail: 'support@example.test',
    },
    TeamSettings: {ExperimentalEnableAutomaticReplies: false},
    ConnectedWorkspacesSettings: {EnableSharedChannels: false, EnableRemoteClusterService: false},
    ExperimentalSettings: {EnableSharedChannels: false, EnableRemoteClusterService: false},
    PluginSettings: {
        Plugins: {
            'com.mattermost.agents': {apiKey: 'real-secret'},
            'com.mattermost.calls': {DefaultEnabled: false},
            'com.mattermost.demo-plugin': {DialogOnlyMode: false},
        },
        PluginStates: {'com.mattermost.demo-plugin': {Enable: false}},
    },
    EmailSettings: {EnableSignInWithEmail: false, EnableSignInWithUsername: false},
    AccessControlSettings: {EnableAttributeBasedAccessControl: false, EnableUserManagedAttributes: false},
    FeatureFlags: {
        ChannelAttributes: false,
        PermissionPolicies: true,
        ChannelPermissionPolicies: false,
        BurnOnRead: false,
        AutoTranslation: false,
        ContentFlagging: false,
        ChannelAttributesRequired: true,
        ClassificationMarkings: false,
        MobileEphemeralMode: true,
    },
});

type FakeOptions = {
    config?: JsonRecord;
    secretKeys?: Record<string, string[]>;
    environment?: JsonRecord;
    ignoredFlagWrites?: string[];
    failConfigPatch?: boolean;
    clientLagReads?: number;
    policies?: Array<{id: string; name: string; type: string}>;
    remoteClusters?: Array<{remote_id: string; name: string}>;
    classificationFields?: Record<string, Array<{id: string; name: string; delete_at: number}>>;

    /** Client config values that differ from the server's flags, e.g. a stale client copy. */
    clientOverrides?: Record<string, string>;

    /** When set, GET /config hides Plugins entries of other plugins, as the server does for uninstalled ones. */
    installedPlugins?: string[];
};

/** A fake server with the write semantics that matter: FeatureFlags and PluginStates replace wholesale, Plugins keep omitted entries, env-pinned keys ignore patches, client flags can lag. */
function createFakeServer(options: FakeOptions = {}) {
    const config = structuredClone(options.config ?? freshConfig());
    const environment = structuredClone(options.environment ?? {});
    const calls: Call[] = [];
    const policies = [...(options.policies ?? [])];
    const remoteClusters = [...(options.remoteClusters ?? [])];
    const classificationFields = structuredClone(options.classificationFields ?? {});
    let clientReads = 0;

    const secretKeys = options.secretKeys ?? {'com.mattermost.agents': ['apiKey']};
    const isPinned = (names: string[]) => names.reduce<any>((node, name) => node?.[name], environment) === true;

    const mergeInto = (target: JsonRecord, patch: JsonRecord, path: string[]) => {
        for (const [key, value] of Object.entries(patch)) {
            if (!(key in target) || isPinned([...path, key])) {
                continue;
            }
            if (key === 'Plugins' && isRecord(value)) {
                // The server keeps stored plugin entries that a patch leaves out.
                const stored = target[key] as JsonRecord;
                const next: JsonRecord = {...value};
                for (const id of Object.keys(stored)) {
                    if (!(id in next)) {
                        next[id] = stored[id];
                    }
                }
                target[key] = next;
                continue;
            }
            const isMap = MAP_FIELDS.includes(key);
            if (isMap || typeof value !== 'object' || value === null || Array.isArray(value) || typeof target[key] !== 'object') {
                target[key] = value;
            } else {
                mergeInto(target[key], value, [...path, key]);
            }
        }
    };

    const applyPatch = (patch: JsonRecord) => {
        for (const [section, value] of Object.entries(patch)) {
            if (section === 'FeatureFlags') {
                const current = config.FeatureFlags as JsonRecord;
                const next: JsonRecord = {};
                for (const name of Object.keys(current)) {
                    next[name] = false;
                }
                for (const [name, flagValue] of Object.entries(value as JsonRecord)) {
                    const keep = isPinned(['FeatureFlags', name]) || options.ignoredFlagWrites?.includes(name) || !(name in current);
                    next[name] = keep ? current[name] : flagValue;
                }
                config.FeatureFlags = next;
            } else if (section in config) {
                mergeInto(config, {[section]: value}, []);
            }
        }
    };

    const respond = (status: number, data: unknown) => ({status, data});

    const transport: BaselineTransport = {
        async request<T = any>(method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH', path: string, body?: unknown) {
            calls.push({method, path, body: body as JsonRecord | undefined});
            const url = new URL(path, SERVER_URL);
            const {pathname, searchParams} = url;

            if (method === 'GET' && pathname === '/api/v4/config') {
                const view = structuredClone(config);
                if (options.installedPlugins) {
                    const plugins = view.PluginSettings?.Plugins ?? {};
                    for (const id of Object.keys(plugins)) {
                        if (!options.installedPlugins.includes(id)) {
                            delete plugins[id];
                        }
                    }
                }
                for (const [id, keys] of Object.entries(secretKeys)) {
                    const entry = view.PluginSettings?.Plugins?.[id];
                    for (const key of keys) {
                        if (entry && key in entry) {
                            entry[key] = REDACTED;
                        }
                    }
                }
                return respond(200, view) as {status: number; data: T};
            }
            if (method === 'GET' && pathname === '/api/v4/plugins') {
                const ids = options.installedPlugins ?? Object.keys((config.PluginSettings as JsonRecord)?.Plugins as JsonRecord ?? {});
                return respond(200, {active: ids.map((id) => ({id})), inactive: []}) as {status: number; data: T};
            }
            if (method === 'GET' && pathname === '/api/v4/config/environment') {
                return respond(200, structuredClone(environment)) as {status: number; data: T};
            }
            if (method === 'GET' && pathname === '/api/v4/config/client') {
                clientReads += 1;
                const lagging = clientReads <= (options.clientLagReads ?? 0);
                const flags = config.FeatureFlags as JsonRecord;
                const client: JsonRecord = {};
                for (const [name, value] of Object.entries(flags)) {
                    client[`FeatureFlag${name}`] = lagging ? 'false' : String(value);
                }
                Object.assign(client, options.clientOverrides);
                return respond(200, client) as {status: number; data: T};
            }
            if (method === 'PUT' && pathname === '/api/v4/config/patch') {
                if (options.failConfigPatch) {
                    return respond(400, {message: 'patch rejected'}) as {status: number; data: T};
                }
                applyPatch(body as JsonRecord);
                return respond(200, structuredClone(config)) as {status: number; data: T};
            }
            if (method === 'POST' && pathname === '/api/v4/access_control_policies/search') {
                const search = body as {type: string; cursor: {id: string}; limit: number};
                const matching = policies.filter((policy) => policy.type === search.type && policy.id > search.cursor.id).
                    sort((a, b) => (a.id < b.id ? -1 : 1));
                return respond(200, {policies: matching.slice(0, search.limit), total: matching.length}) as {status: number; data: T};
            }
            if (method === 'DELETE' && pathname.startsWith('/api/v4/access_control_policies/')) {
                const id = decodeURIComponent(pathname.split('/').at(-1) ?? '');
                const index = policies.findIndex((policy) => policy.id === id);
                if (index >= 0) {
                    policies.splice(index, 1);
                }
                return respond(index >= 0 ? 200 : 404, {}) as {status: number; data: T};
            }
            if (method === 'GET' && pathname === '/api/v4/remotecluster') {
                const page = Number(searchParams.get('page'));
                const perPage = Number(searchParams.get('per_page'));
                return respond(200, remoteClusters.slice(page * perPage, (page + 1) * perPage)) as {status: number; data: T};
            }
            if (method === 'DELETE' && pathname.startsWith('/api/v4/remotecluster/')) {
                const id = decodeURIComponent(pathname.split('/').at(-1) ?? '');
                const index = remoteClusters.findIndex((rc) => rc.remote_id === id);
                if (index >= 0) {
                    remoteClusters.splice(index, 1);
                }
                return respond(index >= 0 ? 200 : 404, {}) as {status: number; data: T};
            }
            const fieldsMatch = pathname.match(/^\/api\/v4\/properties\/groups\/access_control\/([^/]+)\/fields(?:\/([^/]+))?$/);
            if (fieldsMatch) {
                const [, objectType = '', fieldId] = fieldsMatch;
                const fields = classificationFields[objectType] ?? [];
                if (method === 'GET') {
                    return respond(200, fields) as {status: number; data: T};
                }
                if (method === 'DELETE' && fieldId) {
                    classificationFields[objectType] = fields.filter((field) => field.id !== fieldId);
                    return respond(200, {}) as {status: number; data: T};
                }
            }

            return respond(404, {message: `unhandled ${method} ${path}`}) as {status: number; data: T};
        },
    };

    return {transport, calls, config, policies, remoteClusters, classificationFields, environment};
}

const writesOf = (calls: Call[]) => calls.filter((call) => call.method !== 'GET' && call.method !== 'POST');
const patchCalls = (calls: Call[]) => calls.filter((call) => call.method === 'PUT' && call.path === '/api/v4/config/patch');
const sleepNoop = async () => {};

describe('applyBaseline', () => {
    it('drives a drifted server to the baseline with one config patch and one FeatureFlags write', async () => {
        const server = createFakeServer();
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(report.ok, true, JSON.stringify(report.failed));
        assert.equal(patchCalls(server.calls).length, 2, 'one config patch and one flags write');
        assert.equal(server.config.ServiceSettings.CollapsedThreads, 'always_on');
        assert.equal(server.config.FeatureFlags.ChannelAttributes, true);
        assert.equal(server.config.FeatureFlags.MobileEphemeralMode, true, 'flags outside the baseline are kept');
        assert.ok(report.applied.includes('ServiceSettings.CollapsedThreads'));
        assert.ok(report.applied.includes('FeatureFlags.ChannelAttributes'));
    });

    it('never sends a partial FeatureFlags map', async () => {
        const initialFlagKeys = Object.keys(freshConfig().FeatureFlags).sort();
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        const flagWrites = patchCalls(server.calls).filter((call) => call.body?.FeatureFlags !== undefined);
        assert.equal(flagWrites.length, 1);
        assert.deepEqual(Object.keys(flagWrites[0]?.body?.FeatureFlags ?? {}).sort(), initialFlagKeys);
    });

    it('never writes config patches that contain FeatureFlags, and flags never leave the config patch', async () => {
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        const [configPatch] = patchCalls(server.calls);
        assert.equal(configPatch?.body?.FeatureFlags, undefined);
    });

    it('never patches pinned keys, reports them pinnedOk or pinnedMismatch, and keeps pinned flags at their current value', async () => {
        const config = freshConfig();
        config.ServiceSettings.EnableGifPicker = true;
        const server = createFakeServer({
            config,
            environment: {ServiceSettings: {AllowCorsFrom: true, EnableGifPicker: true}, FeatureFlags: {ChannelAttributes: true}},
        });
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.ok(report.pinnedMismatch.includes('ServiceSettings.AllowCorsFrom'));
        assert.ok(report.pinnedOk.includes('ServiceSettings.EnableGifPicker'));
        assert.ok(report.pinnedMismatch.includes('FeatureFlags.ChannelAttributes'));
        assert.equal(report.ok, false, 'a pinned mismatch fails the report');
        assert.ok(report.info.some((line) => line.startsWith('ServiceSettings.AllowCorsFrom is env-pinned to ')), 'the pinned value is reported');

        const writtenValues = JSON.stringify(writesOf(server.calls).map((call) => call.body));
        assert.equal(writtenValues.includes('"AllowCorsFrom"'), false, 'pinned config key must not be patched');
        const flagWrite = patchCalls(server.calls).find((call) => call.body?.FeatureFlags !== undefined);
        assert.equal(flagWrite?.body?.FeatureFlags?.ChannelAttributes, false, 'pinned flag is sent at its current value only');
    });

    it('treats keys the server does not define as unsupported, never as failures', async () => {
        const config = freshConfig();
        delete config.AccessControlSettings;
        delete config.FeatureFlags.ContentFlagging;
        const server = createFakeServer({config});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.ok(report.unsupported.includes('TeamSettings.ExperimentalViewArchivedChannels'));
        assert.ok(report.unsupported.includes('AutoTranslationSettings.Enable'));
        assert.ok(report.unsupported.includes('FeatureFlags.ContentFlagging'));
        assert.ok(report.unsupported.includes('AccessControlSettings.EnableAttributeBasedAccessControl'));
        assert.equal(report.failed.length, 0);
        assert.equal(report.ok, true);

        const written = JSON.stringify(writesOf(server.calls).map((call) => call.body));
        assert.equal(written.includes('ExperimentalViewArchivedChannels'), false);
        assert.equal(written.includes('AutoTranslationSettings'), false);
    });

    it('treats MaxFileSize at or above the baseline as met, including a higher pinned value', async () => {
        const config = freshConfig();
        config.FileSettings.MaxFileSize = 209715200;
        const pinned = createFakeServer({config, environment: {FileSettings: {MaxFileSize: true}}});
        const report = await applyBaseline(pinned.transport, {serverUrl: SERVER_URL});
        assert.ok(report.pinnedOk.includes('FileSettings.MaxFileSize'));
        assert.equal(report.pinnedMismatch.includes('FileSettings.MaxFileSize'), false);

        const low = freshConfig();
        low.FileSettings.MaxFileSize = 1024;
        const shrunk = createFakeServer({config: low});
        await applyBaseline(shrunk.transport, {serverUrl: SERVER_URL});
        assert.equal(shrunk.config.FileSettings.MaxFileSize, 104857600, 'a value below the floor is raised to it');
    });

    it('set-unions AllowedUntrustedInternalConnections, keeping existing entries and adding the server host', async () => {
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.deepEqual(server.config.ServiceSettings.AllowedUntrustedInternalConnections.split(' '), ['example.com', 'site.example.test']);
    });

    it('does not rewrite AllowedUntrustedInternalConnections when the host is already listed', async () => {
        const config = freshConfig();
        config.ServiceSettings.AllowedUntrustedInternalConnections = 'example.com site.example.test';
        const server = createFakeServer({config});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.ok(report.alreadyOk.includes('ServiceSettings.AllowedUntrustedInternalConnections'));
        assert.equal(JSON.stringify(writesOf(server.calls)).includes('AllowedUntrustedInternalConnections'), false);
    });

    it('never writes the redacted placeholder back, and keeps plugin secrets the server hides on GET', async () => {
        const server = createFakeServer();
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(report.ok, true, JSON.stringify(report.failed));
        assert.equal(JSON.stringify(writesOf(server.calls)).includes(REDACTED), false);
        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.agents'].apiKey, 'real-secret');
    });

    it('does not patch a plugin entry whose secrets the server redacts, and reports it failed', async () => {
        const config = freshConfig();
        config.PluginSettings.Plugins['com.mattermost.calls'].licenseToken = 'real-license';
        const server = createFakeServer({config, secretKeys: {'com.mattermost.calls': ['licenseToken']}});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.ok(report.failed.some((line) => line.startsWith('PluginSettings.Plugins[com.mattermost.calls].DefaultEnabled:')));
        assert.equal(report.ok, false);
        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.calls'].licenseToken, 'real-license');
        assert.equal(JSON.stringify(writesOf(server.calls)).includes(REDACTED), false);
        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.demo-plugin'].DialogOnlyMode, true, 'unaffected plugin still applied');
    });

    it('keeps sibling plugin entries when writing one plugin map entry', async () => {
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.agents'].apiKey, 'real-secret');
        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.calls'].DefaultEnabled, true);
        assert.equal(server.config.PluginSettings.Plugins['com.mattermost.demo-plugin'].DialogOnlyMode, true);
        assert.equal(server.config.PluginSettings.PluginStates['com.mattermost.demo-plugin'].Enable, true);
    });

    it('writes settings of a plugin that is not installed yet without failing on the hidden read-back', async () => {
        const demo = 'com.mattermost.demo-plugin';
        const installedPlugins = Object.keys(freshConfig().PluginSettings.Plugins).filter((id) => id !== demo);
        const server = createFakeServer({installedPlugins});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(server.config.PluginSettings.Plugins[demo].DialogOnlyMode, true, 'the write is stored');
        assert.equal(report.failed.some((line) => line.includes(demo)), false);
        assert.ok(report.info.some((line) => line.includes(`hides it until ${demo} is installed`)));
    });

    it('drives a flag the baseline wants off back to false in the full-map write', async () => {
        const server = createFakeServer();
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(server.config.FeatureFlags.ChannelAttributesRequired, false);
        assert.ok(report.applied.includes('FeatureFlags.ChannelAttributesRequired'));
        const flagWrite = patchCalls(server.calls).find((call) => call.body?.FeatureFlags !== undefined);
        assert.equal(flagWrite?.body?.FeatureFlags?.ChannelAttributesRequired, false);
    });

    it('is idempotent: a second apply sends no PUT or DELETE', async () => {
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});
        server.calls.length = 0;

        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(report.ok, true, JSON.stringify(report.failed));
        assert.deepEqual(report.applied, []);
        assert.equal(server.calls.filter((call) => call.method === 'PUT' || call.method === 'DELETE').length, 0);
    });

    it('reports flags the server keeps unchanged after a write as flagsNotWritable, not failure', async () => {
        const server = createFakeServer({ignoredFlagWrites: ['BurnOnRead']});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.deepEqual(report.flagsNotWritable, ['FeatureFlags.BurnOnRead: server kept false after write']);
        assert.equal(report.ok, true);
    });

    it('records a rejected config patch as failed and reports ok false', async () => {
        const server = createFakeServer({failConfigPatch: true});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.equal(report.ok, false);
        assert.ok(report.failed.some((line) => line.startsWith('ServiceSettings.CollapsedThreads: HTTP 400')));
        assert.deepEqual(report.applied.filter((key) => key.startsWith('ServiceSettings.')), []);
    });

    it('removes only E2E-owned leftovers during cleanup', async () => {
        const server = createFakeServer({
            policies: [
                {id: 'pol1', name: 'abac-old', type: 'permission'},
                {id: 'pol2', name: 'e2e-old', type: 'permission'},
                {id: 'pol3', name: 'probe-old', type: 'permission'},
                {id: 'pol4', name: 'customer-policy', type: 'permission'},
            ],
            remoteClusters: [{remote_id: 'rc1', name: 'e2e_leftover'}, {remote_id: 'rc2', name: 'prod_cluster'}, {remote_id: 'rc3', name: 'e2e-remote-ab12cd'}],
            classificationFields: {
                channel: [{id: 'f4', name: 'sensitivity_a1b2c3', delete_at: 0}, {id: 'f6', name: 'customer_field', delete_at: 0}],
                system: [{id: 'f1', name: 'classification', delete_at: 0}, {id: 'f2', name: 'other', delete_at: 0}],
                user: [],
                template: [{id: 'f3', name: 'classification', delete_at: 0}, {id: 'f5', name: 'sensitivity_a1b2c3', delete_at: 0}],
            },
        });
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        assert.deepEqual(report.cleanup, {permission_policies: 3, remote_clusters: 2, property_fields: 4});
        assert.deepEqual(server.classificationFields.channel?.map((field) => field.name), ['customer_field']);
        assert.deepEqual(server.policies.map((policy) => policy.name), ['customer-policy']);
        assert.deepEqual(server.remoteClusters.map((rc) => rc.name), ['prod_cluster']);
        assert.deepEqual(server.classificationFields.system?.map((field) => field.name), ['other']);
    });

    it('skips cleanup deletes when cleanup is disabled', async () => {
        const server = createFakeServer({policies: [{id: 'pol1', name: 'e2e-old', type: 'permission'}]});
        const report = await applyBaseline(server.transport, {serverUrl: SERVER_URL, cleanup: false});

        assert.deepEqual(report.cleanup, {});
        assert.equal(server.policies.length, 1);
    });

    it('applies only the requested keys when `only` is set', async () => {
        const server = createFakeServer();
        const report = await applyBaseline(server.transport, {
            serverUrl: SERVER_URL,
            only: ['ServiceSettings.EnableGifPicker'],
            cleanup: false,
        });

        assert.deepEqual(report.applied, ['ServiceSettings.EnableGifPicker']);
        assert.equal(patchCalls(server.calls).length, 1);
        assert.equal(patchCalls(server.calls)[0]?.body?.FeatureFlags, undefined);
    });
});

describe('verifyBaseline', () => {
    it('is read-only: no PUT, POST, DELETE or PATCH on a drifted server', async () => {
        const server = createFakeServer();
        const report = await verifyBaseline(server.transport, {serverUrl: SERVER_URL, sleep: sleepNoop});

        assert.equal(report.ok, false);
        assert.ok(report.failed.some((line) => line.startsWith('ServiceSettings.CollapsedThreads:')));
        assert.equal(server.calls.filter((call) => call.method !== 'GET').length, 0);
    });

    it('reports a plugin setting whose plugin is not installed as info, naming the plugin', async () => {
        const demo = 'com.mattermost.demo-plugin';
        const installedPlugins = Object.keys(freshConfig().PluginSettings.Plugins).filter((id) => id !== demo);
        const server = createFakeServer({installedPlugins});
        const report = await verifyBaseline(server.transport, {serverUrl: SERVER_URL, clientPollTimeoutMs: 0, sleep: sleepNoop});

        assert.ok(report.info.some((line) => line.startsWith(`PluginSettings.Plugins[${demo}].DialogOnlyMode: ${demo} is not installed`)));
        assert.equal(report.failed.some((line) => line.includes('DialogOnlyMode')), false);
    });

    it('fails when clients still see a flag on that the baseline wants off', async () => {
        const config = freshConfig();
        config.FeatureFlags.ChannelAttributesRequired = false;
        const server = createFakeServer({config, clientOverrides: {FeatureFlagChannelAttributesRequired: 'true'}});
        const report = await verifyBaseline(server.transport, {serverUrl: SERVER_URL, clientPollTimeoutMs: 0, sleep: sleepNoop});

        assert.ok(report.failed.some((line) => line.startsWith('FeatureFlags.ChannelAttributesRequired: client reports true while server is false')));
    });

    it('reports maestro-owned drift as info, not failure', async () => {
        const server = createFakeServer();
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});
        server.config.SupportSettings.AllowDownloadLogs = false;

        const report = await verifyBaseline(server.transport, {serverUrl: SERVER_URL, sleep: sleepNoop});

        assert.equal(report.ok, true, JSON.stringify(report.failed));
        assert.ok(report.info.some((line) => line.includes('SupportSettings.AllowDownloadLogs')));
    });

    it('fails when clients never see a flag the server has on', async () => {
        const server = createFakeServer({clientLagReads: Number.POSITIVE_INFINITY});
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        const report = await verifyBaseline(server.transport, {
            serverUrl: SERVER_URL,
            clientPollTimeoutMs: 4_000,
            clientPollIntervalMs: 2_000,
            sleep: sleepNoop,
        });

        assert.equal(report.ok, false);
        assert.ok(report.failed.some((line) => line.startsWith('FeatureFlags.ChannelAttributes: client reports false')));
    });

    it('passes when client flags catch up within the poll budget', async () => {
        const server = createFakeServer({clientLagReads: 2});
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});
        server.calls.length = 0;

        const report = await verifyBaseline(server.transport, {
            serverUrl: SERVER_URL,
            clientPollTimeoutMs: 30_000,
            clientPollIntervalMs: 2_000,
            sleep: sleepNoop,
        });

        assert.equal(report.ok, true, JSON.stringify(report.failed));
        assert.equal(server.calls.filter((call) => call.path.startsWith('/api/v4/config/client')).length, 3);
    });

    it('reports a server flag left at false as flagsNotWritable', async () => {
        const server = createFakeServer({ignoredFlagWrites: ['BurnOnRead']});
        await applyBaseline(server.transport, {serverUrl: SERVER_URL});

        const report = await verifyBaseline(server.transport, {serverUrl: SERVER_URL, sleep: sleepNoop});

        assert.ok(report.flagsNotWritable.some((line) => line.startsWith('FeatureFlags.BurnOnRead:')));
    });
});

describe('inspectBaselineKeys', () => {
    it('reports expected and actual values, with absent-is-baseline keys matching when absent', async () => {
        const server = createFakeServer();
        const statuses = await inspectBaselineKeys(server.transport, {
            serverUrl: SERVER_URL,
            keys: ['ServiceSettings.CollapsedThreads', 'TeamSettings.ExperimentalViewArchivedChannels', 'FeatureFlags.ChannelAttributes'],
        });

        const byKey = Object.fromEntries(statuses.map((status) => [status.key, status]));
        assert.equal(byKey['ServiceSettings.CollapsedThreads']?.matches, false);
        assert.equal(byKey['TeamSettings.ExperimentalViewArchivedChannels']?.matches, true);
        assert.equal(byKey['FeatureFlags.ChannelAttributes']?.matches, false);
        assert.equal(byKey['ServiceSettings.CollapsedThreads']?.expected, '"always_on"');
        assert.equal(byKey['ServiceSettings.CollapsedThreads']?.actual, '"default_off"');
    });
});

describe('baseline declarations', () => {
    it('parses dotted map keys without splitting plugin IDs', () => {
        assert.deepEqual(parseConfigPath('PluginSettings.Plugins[com.mattermost.calls].DefaultEnabled'), [
            {name: 'PluginSettings', mapKey: false},
            {name: 'Plugins', mapKey: false},
            {name: 'com.mattermost.calls', mapKey: true},
            {name: 'DefaultEnabled', mapKey: false},
        ]);
    });

    it('never declares Maestro-owned ReportAProblem keys as baseline entries', () => {
        assert.equal(Object.keys(CONFIG_BASELINE).some((key) => key.startsWith('SupportSettings.ReportAProblem')), false);
    });

    it('recognises baseline keys and rejects unknown ones', () => {
        assert.equal(isBaselineKey('FeatureFlags.ChannelAttributes'), true);
        assert.equal(isBaselineKey('FeatureFlags.NotAFlag'), false);
        assert.equal(isBaselineKey('ServiceSettings.NotASetting'), false);
        assert.equal(isBaselineKey('ServiceSettings.EnableGifPicker'), true);
        assert.equal(Object.values(FEATURE_FLAG_BASELINE).every((value) => typeof value === 'boolean'), true);
        assert.equal(FEATURE_FLAG_BASELINE.ChannelAttributesRequired, false);
    });
});
