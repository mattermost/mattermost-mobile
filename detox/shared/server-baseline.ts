// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** Declares the E2E server baseline and drives a server to it. Transport-agnostic. */

import {DEFAULT_MAX_FILE_SIZE_BYTES} from '@support/constants/file_settings';

export type BaselineTransport = {
    request<T = any>(method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH', path: string, body?: unknown): Promise<{status: number; data: T}>;
};

export type BaselineEntry = {
    value: unknown;

    /** Absence means the feature is effectively on (the app treats a missing key as enabled). */
    absentIsBaseline?: boolean;

    /** Numeric floor: any value at or above `value` meets the baseline. */
    atLeast?: boolean;

    /** Maestro flows own this key: drift is reported as info, never as a failure. */
    owner?: 'maestro';

    /** Value is a space-separated list that must contain the server's own hostname (set-union, existing entries kept). */
    listContainsServerHost?: boolean;
};

export type BaselineReport = {
    applied: string[];
    alreadyOk: string[];
    pinnedOk: string[];
    pinnedMismatch: string[];
    unsupported: string[];
    flagsNotWritable: string[];
    failed: string[];
    cleanup: Record<string, number>;
    info: string[];
    ok: boolean;
};

export type BaselineOptions = {
    serverUrl: string;
    log?: (message: string) => void;

    /** Restricts the run to these keys (dotted config paths or `FeatureFlags.<Name>`). */
    only?: readonly string[];

    /** Removes leftover E2E objects. Default true. */
    cleanup?: boolean;
};

export type VerifyOptions = {
    serverUrl: string;
    only?: readonly string[];

    /** Client-config propagation polling for flags; defaults to 30s at 2s intervals. */
    clientPollTimeoutMs?: number;
    clientPollIntervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
};

export type BaselineKeyStatus = {
    key: string;
    expected: string;
    actual: string;
    supported: boolean;
    pinned: boolean;
    matches: boolean;
};

export const CONFIG_BASELINE: Readonly<Record<string, BaselineEntry>> = {
    'PluginSettings.Plugins[com.mattermost.calls].DefaultEnabled': {value: true},
    'FileSettings.MaxFileSize': {value: DEFAULT_MAX_FILE_SIZE_BYTES, atLeast: true},
    'FileSettings.EnablePublicLink': {value: true},
    'FileSettings.EnableFileAttachments': {value: true},
    'FileSettings.EnableMobileUpload': {value: true},
    'FileSettings.EnableMobileDownload': {value: true},
    'SupportSettings.AllowDownloadLogs': {value: true, owner: 'maestro'},
    'SupportSettings.CustomTermsOfServiceEnabled': {value: false},
    'TeamSettings.ExperimentalViewArchivedChannels': {value: true, absentIsBaseline: true},
    'TeamSettings.ExperimentalEnableAutomaticReplies': {value: true},
    'ConnectedWorkspacesSettings.EnableSharedChannels': {value: true},
    'ConnectedWorkspacesSettings.EnableRemoteClusterService': {value: true},
    'ExperimentalSettings.EnableSharedChannels': {value: true},
    'ExperimentalSettings.EnableRemoteClusterService': {value: true},
    'ServiceSettings.CollapsedThreads': {value: 'always_on'},
    'ServiceSettings.ThreadAutoFollow': {value: true},
    'ServiceSettings.EnableCrossTeamSearch': {value: true},
    'ServiceSettings.ScheduledPosts': {value: true},
    'ServiceSettings.EnablePostUsernameOverride': {value: true},
    'ServiceSettings.EnableBurnOnRead': {value: true},
    'ServiceSettings.EnableGifPicker': {value: true},
    'ServiceSettings.AllowCorsFrom': {value: '*'},
    'ServiceSettings.AllowedUntrustedInternalConnections': {value: '', listContainsServerHost: true},
    'ServiceSettings.EnableMultifactorAuthentication': {value: false},
    'EmailSettings.EnableSignInWithEmail': {value: true},
    'EmailSettings.EnableSignInWithUsername': {value: true},
    'AccessControlSettings.EnableAttributeBasedAccessControl': {value: true},
    'AccessControlSettings.EnableUserManagedAttributes': {value: true},
    'AutoTranslationSettings.Enable': {value: true},
    'AutoTranslationSettings.Provider': {value: 'libretranslate'},
    'AutoTranslationSettings.TargetLanguages': {value: ['es', 'en']},
    'AutoTranslationSettings.LibreTranslate.URL': {value: 'https://example.com'},
};

/** Server FeatureFlags and the value each must have. Only flags the server defines are written. */
export const FEATURE_FLAG_BASELINE: Readonly<Record<string, boolean>> = {
    ChannelAttributes: true,
    PermissionPolicies: true,
    ChannelPermissionPolicies: true,
    BurnOnRead: true,
    AutoTranslation: true,
    ContentFlagging: true,
    ClassificationMarkings: true,

    // A spec turns this on for itself; a failed reset must not leak into later mutation specs.
    ChannelAttributesRequired: false,
};

const E2E_POLICY_PREFIXES = ['abac-', 'e2e-', 'probe-'];

// e2e_ from share_with_connected_workspaces; e2e-remote- from System.apiEnsureAtLeastOneConfirmedRemoteCluster.
const E2E_REMOTE_CLUSTER_PREFIXES = ['e2e_', 'e2e-remote-'];
const CLASSIFICATION_GROUP = 'access_control';
const CLASSIFICATION_FIELD = 'classification';
const CLASSIFICATION_OBJECT_TYPES = ['channel', 'system', 'user', 'template'];
const CLEANUP_PAGE_SIZE = 100;
const CLEANUP_MAX_PAGES = 50;
const CLIENT_POLL_TIMEOUT_MS = 30_000;
const CLIENT_POLL_INTERVAL_MS = 2_000;

type Segment = {name: string; mapKey: boolean};
type JsonRecord = Record<string, unknown>;

type ConfigTarget = {kind: 'config'; key: string; segments: Segment[]; entry: BaselineEntry};
type FlagTarget = {kind: 'flag'; key: string; name: string; value: boolean};
type Written = {target: Target; evaluation: Evaluation};
type Target = ConfigTarget | FlagTarget;

type Snapshot = {config: JsonRecord; environment: JsonRecord};

type Evaluation = {
    kind: 'config' | 'flag';
    key: string;
    supported: boolean;
    pinned: boolean;
    matches: boolean;
    owner?: 'maestro';
    expected: string;
    actual: string;
    desired: unknown;
    segments: Segment[];
    flagName?: string;
};

const noop = (): void => {
    // Intentionally empty: callers that pass no log sink get silence.
};

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (object: JsonRecord, name: string): boolean => Object.prototype.hasOwnProperty.call(object, name);

const messageOf = (data: unknown): string => {
    if (isRecord(data) && typeof data.message === 'string') {
        return data.message;
    }
    return JSON.stringify(data) ?? 'no body';
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Splits a baseline key into segments. Dots separate names; `[...]` is one map-key segment and may contain dots.
 */
export function parseConfigPath(key: string): Segment[] {
    const segments: Segment[] = [];
    let name = '';
    let index = 0;

    const flush = () => {
        if (name) {
            segments.push({name, mapKey: false});
            name = '';
        }
    };

    while (index < key.length) {
        const char = key.charAt(index);
        if (char === '[') {
            flush();
            const end = key.indexOf(']', index);
            if (end < 0) {
                throw new Error(`Invalid baseline key (unclosed "["): ${key}`);
            }
            segments.push({name: key.slice(index + 1, end), mapKey: true});
            index = end + 1;
        } else if (char === '.') {
            flush();
            index += 1;
        } else {
            name += char;
            index += 1;
        }
    }
    flush();

    return segments;
}

/** Map entries are supported when their map exists; struct paths only when every segment exists. */
function resolveConfig(config: JsonRecord, segments: Segment[]): {supported: boolean; value: unknown} {
    const mapIndex = segments.findIndex((segment) => segment.mapKey);
    if (mapIndex < 0) {
        return readPath(config, segments.map((segment) => segment.name));
    }

    const container = readPath(config, segments.slice(0, mapIndex).map((segment) => segment.name));
    if (!container.supported || !isRecord(container.value)) {
        return {supported: false, value: undefined};
    }

    const entry = readPath(container.value, segments.slice(mapIndex).map((segment) => segment.name));
    return {supported: true, value: entry.value};
}

function readPath(root: unknown, names: readonly string[]): {supported: boolean; value: unknown} {
    let node: unknown = root;
    for (const name of names) {
        if (!isRecord(node) || !hasOwn(node, name)) {
            return {supported: false, value: undefined};
        }
        node = node[name];
    }
    return {supported: true, value: node};
}

function setPath(root: JsonRecord, names: readonly string[], value: unknown): void {
    let node = root;
    for (const name of names.slice(0, -1)) {
        if (!isRecord(node[name])) {
            node[name] = {};
        }
        node = node[name] as JsonRecord;
    }
    const last = names.at(-1);
    if (last !== undefined) {
        node[last] = value;
    }
}

const cloneJson = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)) as T);

/** Placeholder GET /config returns in place of secret settings. It must never be written back. */
const REDACTED_SETTING = '*'.repeat(32);

function containsRedacted(value: unknown): boolean {
    if (value === REDACTED_SETTING) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.some(containsRedacted);
    }
    return isRecord(value) && Object.values(value).some(containsRedacted);
}

/** True when a map entry holds a redacted secret, so a patch of it would overwrite the real value. */
function hasRedactedEntry(config: JsonRecord, segments: Segment[]): boolean {
    const mapIndex = segments.findIndex((segment) => segment.mapKey);
    if (mapIndex < 0) {
        return false;
    }
    const entry = readPath(config, segments.slice(0, mapIndex + 1).map((segment) => segment.name));
    return entry.supported && containsRedacted(entry.value);
}

/** Copies a map for a patch, leaving out entries with redacted secrets (the server keeps omitted Plugins entries). */
function copyMapWithoutRedacted(current: unknown): JsonRecord {
    const copy: JsonRecord = {};
    if (isRecord(current)) {
        for (const [key, entry] of Object.entries(current)) {
            if (!containsRedacted(entry)) {
                copy[key] = cloneJson(entry);
            }
        }
    }
    return copy;
}

/** Builds a config patch. Map fields are sent as a copy of the current map with the change applied. */
function buildConfigPatch(writes: Array<{segments: Segment[]; value: unknown}>, config: JsonRecord): JsonRecord {
    const patch: JsonRecord = {};

    for (const {segments, value} of writes) {
        const mapIndex = segments.findIndex((segment) => segment.mapKey);
        if (mapIndex < 0) {
            setPath(patch, segments.map((segment) => segment.name), value);
            continue;
        }

        const containerNames = segments.slice(0, mapIndex).map((segment) => segment.name);
        if (!readPath(patch, containerNames).supported) {
            setPath(patch, containerNames, copyMapWithoutRedacted(readPath(config, containerNames).value));
        }

        const container = readPath(patch, containerNames).value as JsonRecord;
        setPath(container, segments.slice(mapIndex).map((segment) => segment.name), value);
    }

    return patch;
}

const splitList = (value: unknown): string[] => (typeof value === 'string' ? value.split(/[\s,]+/).filter(Boolean) : []);

function serverHost(serverUrl: string): string {
    return new URL(serverUrl).hostname;
}

function flagsOf(config: JsonRecord): JsonRecord {
    return isRecord(config.FeatureFlags) ? config.FeatureFlags : {};
}

function buildTargets(only?: readonly string[]): Target[] {
    const onlySet = only ? new Set(only) : undefined;
    const targets: Target[] = [];

    for (const [key, entry] of Object.entries(CONFIG_BASELINE)) {
        if (!onlySet || onlySet.has(key)) {
            targets.push({kind: 'config', key, segments: parseConfigPath(key), entry});
        }
    }

    for (const [name, value] of Object.entries(FEATURE_FLAG_BASELINE)) {
        const key = `FeatureFlags.${name}`;
        if (!onlySet || onlySet.has(key)) {
            targets.push({kind: 'flag', key, name, value});
        }
    }

    return targets;
}

function evaluate(target: Target, snapshot: Snapshot, host: string): Evaluation {
    if (target.kind === 'flag') {
        const flags = flagsOf(snapshot.config);
        const supported = hasOwn(flags, target.name);
        const current = flags[target.name];
        return {
            kind: 'flag',
            key: target.key,
            supported,
            pinned: readPath(snapshot.environment, ['FeatureFlags', target.name]).value === true,
            matches: current === target.value,
            expected: String(target.value),
            actual: supported ? String(current) : 'absent',
            desired: target.value,
            segments: [],
            flagName: target.name,
        };
    }

    const {entry, segments} = target;
    const resolved = resolveConfig(snapshot.config, segments);
    const pinned = readPath(snapshot.environment, segments.map((segment) => segment.name)).value === true;

    let matches: boolean;
    let expected: string;
    let desired: unknown;
    if (entry.listContainsServerHost) {
        const tokens = splitList(resolved.value);
        matches = tokens.includes(host);
        expected = `list containing ${host}`;
        desired = matches ? resolved.value : [...tokens, host].join(' ');
    } else if (entry.atLeast) {
        matches = typeof resolved.value === 'number' && typeof entry.value === 'number' && resolved.value >= entry.value;
        expected = `>= ${JSON.stringify(entry.value)}`;
        desired = entry.value;
    } else {
        matches = (entry.absentIsBaseline === true && !resolved.supported) ||
            JSON.stringify(resolved.value) === JSON.stringify(entry.value);
        expected = JSON.stringify(entry.value);
        desired = entry.value;
    }

    return {
        kind: 'config',
        key: target.key,
        supported: resolved.supported,
        pinned,
        matches,
        owner: entry.owner,
        expected,
        actual: resolved.supported ? String(JSON.stringify(resolved.value)) : 'absent',
        desired,
        segments,
    };
}

async function readConfig(transport: BaselineTransport): Promise<JsonRecord> {
    const res = await transport.request<unknown>('GET', '/api/v4/config');
    if (res.status >= 400 || !isRecord(res.data)) {
        throw new Error(`GET /api/v4/config failed (HTTP ${res.status})`);
    }
    return res.data;
}

async function readSnapshot(transport: BaselineTransport): Promise<Snapshot> {
    const config = await readConfig(transport);
    const envRes = await transport.request<unknown>('GET', '/api/v4/config/environment');
    if (envRes.status >= 400 || !isRecord(envRes.data)) {
        throw new Error(`GET /api/v4/config/environment failed (HTTP ${envRes.status}); pinned settings cannot be determined`);
    }
    return {config, environment: envRes.data};
}

/** Returns an error message on failure, or undefined on success. Never throws. */
async function writePatch(transport: BaselineTransport, body: JsonRecord): Promise<string | undefined> {
    try {
        const res = await transport.request<unknown>('PUT', '/api/v4/config/patch', body);
        if (res.status >= 400) {
            return `HTTP ${res.status}: ${messageOf(res.data)}`;
        }
        return undefined;
    } catch (error) {
        return errorMessage(error);
    }
}

function emptyReport(): BaselineReport {
    return {
        applied: [],
        alreadyOk: [],
        pinnedOk: [],
        pinnedMismatch: [],
        unsupported: [],
        flagsNotWritable: [],
        failed: [],
        cleanup: {},
        info: [],
        ok: false,
    };
}

function finalize(report: BaselineReport): BaselineReport {
    report.ok = report.failed.length === 0 && report.pinnedMismatch.length === 0;
    return report;
}

/** Pinned keys cannot be written; a mismatch is reported with the pinned value so the env can be fixed. */
function recordPinned(evaluation: Evaluation, report: BaselineReport): void {
    if (evaluation.matches) {
        report.pinnedOk.push(evaluation.key);
        return;
    }
    report.pinnedMismatch.push(evaluation.key);
    report.info.push(`${evaluation.key} is env-pinned to ${evaluation.actual}; baseline ${evaluation.expected}`);
}

/** GET /config omits the settings of plugins that are not installed (server PluginSettings.Sanitize). */
const pluginIdOf = (segments: Segment[]): string | undefined => (
    segments[0]?.name === 'PluginSettings' && segments[1]?.name === 'Plugins' && segments[2]?.mapKey ? segments[2].name : undefined
);

async function readInstalledPlugins(transport: BaselineTransport): Promise<Set<string>> {
    const res = await transport.request<unknown>('GET', '/api/v4/plugins');
    if (res.status >= 400 || !isRecord(res.data)) {
        throw new Error(`GET /api/v4/plugins failed (HTTP ${res.status})`);
    }
    const listed = [res.data.active, res.data.inactive].flatMap((list) => (Array.isArray(list) ? list : []));
    return new Set(listed.map((plugin) => (isRecord(plugin) ? plugin.id : undefined)).filter((id): id is string => typeof id === 'string'));
}

/** The plugin a mismatched key belongs to, when that plugin is not installed and so its settings cannot be read. */
async function uninstalledPluginOf(
    transport: BaselineTransport,
    segments: Segment[],
    cache: {installed?: Set<string>},
): Promise<string | undefined> {
    const pluginId = pluginIdOf(segments);
    if (!pluginId) {
        return undefined;
    }
    cache.installed ??= await readInstalledPlugins(transport);
    return cache.installed.has(pluginId) ? undefined : pluginId;
}

async function deletePermissionPolicies(transport: BaselineTransport, report: BaselineReport): Promise<number> {
    let removed = 0;
    let cursor = '';

    for (let page = 0; page < CLEANUP_MAX_PAGES; page++) {
        // eslint-disable-next-line no-await-in-loop -- cursor pagination
        const res = await transport.request<{policies?: Array<{id?: string; name?: string}>}>(
            'POST',
            '/api/v4/access_control_policies/search',
            {type: 'permission', term: '', limit: CLEANUP_PAGE_SIZE, cursor: {id: cursor}},
        );
        if (res.status >= 400) {
            report.info.push(`permission policy cleanup skipped (search HTTP ${res.status})`);
            return removed;
        }

        const policies = Array.isArray(res.data?.policies) ? res.data.policies : [];
        for (const policy of policies) {
            if (policy.id && policy.name && E2E_POLICY_PREFIXES.some((prefix) => policy.name?.startsWith(prefix))) {
                // eslint-disable-next-line no-await-in-loop -- sequential deletes keep the log readable
                const del = await transport.request('DELETE', `/api/v4/access_control_policies/${encodeURIComponent(policy.id)}`);
                if (del.status < 400) {
                    removed += 1;
                } else {
                    report.info.push(`could not delete permission policy ${policy.name} (HTTP ${del.status})`);
                }
            }
        }

        const lastId = policies.at(-1)?.id ?? '';
        if (policies.length < CLEANUP_PAGE_SIZE || !lastId) {
            break;
        }
        cursor = lastId;
    }

    return removed;
}

async function deleteE2eRemoteClusters(transport: BaselineTransport, report: BaselineReport): Promise<number> {
    const remoteIds: string[] = [];

    for (let page = 0; page < CLEANUP_MAX_PAGES; page++) {
        // eslint-disable-next-line no-await-in-loop -- paged read
        const res = await transport.request<Array<{remote_id?: string; name?: string}>>(
            'GET',
            `/api/v4/remotecluster?page=${page}&per_page=${CLEANUP_PAGE_SIZE}`,
        );
        if (res.status >= 400) {
            report.info.push(`remote cluster cleanup skipped (list HTTP ${res.status})`);
            return 0;
        }

        const rows = Array.isArray(res.data) ? res.data : [];
        for (const row of rows) {
            if (row.remote_id && E2E_REMOTE_CLUSTER_PREFIXES.some((prefix) => row.name?.startsWith(prefix))) {
                remoteIds.push(row.remote_id);
            }
        }
        if (rows.length < CLEANUP_PAGE_SIZE) {
            break;
        }
    }

    let removed = 0;
    for (const remoteId of remoteIds) {
        // eslint-disable-next-line no-await-in-loop -- sequential deletes
        const del = await transport.request('DELETE', `/api/v4/remotecluster/${encodeURIComponent(remoteId)}`);
        if (del.status < 400) {
            removed += 1;
        } else {
            report.info.push(`could not delete remote cluster ${remoteId} (HTTP ${del.status})`);
        }
    }

    return removed;
}

/** The classification field, and channel attribute fields named with a suite suffix (channel_attributes_fixtures.ts). */
const isE2ePropertyField = (name?: string) => name === CLASSIFICATION_FIELD || /_[0-9a-f]{6}$/.test(name ?? '');

async function deleteE2ePropertyFields(transport: BaselineTransport): Promise<number> {
    let removed = 0;

    for (const objectType of CLASSIFICATION_OBJECT_TYPES) {
        // eslint-disable-next-line no-await-in-loop -- order matters across object types
        const res = await transport.request<Array<{id?: string; name?: string; delete_at?: number}>>(
            'GET',
            `/api/v4/properties/groups/${CLASSIFICATION_GROUP}/${objectType}/fields?target_type=system`,
        );
        if (res.status >= 400 || !Array.isArray(res.data)) {
            continue;
        }

        for (const field of res.data) {
            if (field.id && isE2ePropertyField(field.name) && field.delete_at === 0) {
                // eslint-disable-next-line no-await-in-loop -- dependents must go before the template
                const del = await transport.request('DELETE', `/api/v4/properties/groups/${CLASSIFICATION_GROUP}/${objectType}/fields/${field.id}`);
                if (del.status < 400) {
                    removed += 1;
                }
            }
        }
    }

    return removed;
}

async function runCleanup(transport: BaselineTransport, report: BaselineReport): Promise<void> {
    const steps: Array<[string, () => Promise<number>]> = [
        ['permission_policies', () => deletePermissionPolicies(transport, report)],
        ['remote_clusters', () => deleteE2eRemoteClusters(transport, report)],
        ['property_fields', () => deleteE2ePropertyFields(transport)],
    ];

    for (const [label, step] of steps) {
        try {
            // eslint-disable-next-line no-await-in-loop -- cleanup steps run in order
            report.cleanup[label] = await step();
        } catch (error) {
            report.cleanup[label] = 0;
            report.info.push(`${label} cleanup skipped: ${errorMessage(error)}`);
        }
    }
}

/** Writes only drifted, non-pinned config keys in one patch, then the full FeatureFlags map once. */
export async function applyBaseline(transport: BaselineTransport, opts: BaselineOptions): Promise<BaselineReport> {
    const report = emptyReport();
    const log = opts.log ?? noop;
    const host = serverHost(opts.serverUrl);
    const targets = buildTargets(opts.only);

    const snapshot = await readSnapshot(transport);
    const configWrites: Written[] = [];

    for (const target of targets) {
        if (target.kind !== 'config') {
            continue;
        }
        const evaluation = evaluate(target, snapshot, host);
        if (!evaluation.supported) {
            report.unsupported.push(evaluation.key);
        } else if (evaluation.pinned) {
            recordPinned(evaluation, report);
        } else if (evaluation.matches) {
            report.alreadyOk.push(evaluation.key);
        } else if (hasRedactedEntry(snapshot.config, evaluation.segments)) {
            report.failed.push(`${evaluation.key}: entry holds server-redacted secrets; not patched so the real values are kept`);
        } else {
            configWrites.push({target, evaluation});
        }
    }

    if (configWrites.length > 0) {
        log(`Patching ${configWrites.length} server setting(s)...`);
        const patch = buildConfigPatch(
            configWrites.map(({evaluation}) => ({segments: evaluation.segments, value: evaluation.desired})),
            snapshot.config,
        );
        const error = await writePatch(transport, patch);
        if (error) {
            configWrites.forEach(({evaluation}) => report.failed.push(`${evaluation.key}: ${error}`));
        } else {
            const after: Snapshot = {config: await readConfig(transport), environment: snapshot.environment};
            await recordWrites(transport, configWrites, after, host, report, 'failed');
        }
    }

    // Read-modify-write: the server replaces FeatureFlags wholesale, so the full current map is sent.
    const freshConfig = await readConfig(transport);
    const flagState: Snapshot = {config: freshConfig, environment: snapshot.environment};
    const flagWrites: Written[] = [];
    const changes: JsonRecord = {};

    for (const target of targets) {
        if (target.kind !== 'flag') {
            continue;
        }
        const evaluation = evaluate(target, flagState, host);
        if (!evaluation.supported) {
            report.unsupported.push(evaluation.key);
        } else if (evaluation.pinned) {
            recordPinned(evaluation, report);
        } else if (evaluation.matches) {
            report.alreadyOk.push(evaluation.key);
        } else {
            flagWrites.push({target, evaluation});
            changes[target.name] = target.value;
        }
    }

    if (flagWrites.length > 0) {
        log(`Writing ${flagWrites.length} feature flag(s) with the full current FeatureFlags map...`);
        const fullFlags = {...flagsOf(freshConfig), ...changes};
        const error = await writePatch(transport, {FeatureFlags: fullFlags});
        if (error) {
            flagWrites.forEach(({evaluation}) => report.failed.push(`${evaluation.key}: ${error}`));
        } else {
            const after: Snapshot = {config: await readConfig(transport), environment: snapshot.environment};
            await recordWrites(transport, flagWrites, after, host, report, 'flagsNotWritable');
        }
    }

    if (opts.cleanup !== false) {
        await runCleanup(transport, report);
    }

    return finalize(report);
}

/** After a write, re-reads each key: applied when it now matches, otherwise recorded under `failureList`. */
async function recordWrites(
    transport: BaselineTransport,
    writes: Written[],
    after: Snapshot,
    host: string,
    report: BaselineReport,
    failureList: 'failed' | 'flagsNotWritable',
): Promise<void> {
    const plugins: {installed?: Set<string>} = {};
    for (const {target, evaluation} of writes) {
        const check = evaluate(target, after, host);
        // eslint-disable-next-line no-await-in-loop -- reads the plugin list at most once
        const hiddenPlugin = check.matches ? undefined : await uninstalledPluginOf(transport, evaluation.segments, plugins);
        if (check.matches) {
            report.applied.push(evaluation.key);
        } else if (hiddenPlugin) {
            report.info.push(`${evaluation.key}: written, but the server hides it until ${hiddenPlugin} is installed`);
        } else if (failureList === 'failed') {
            report.failed.push(`${evaluation.key}: write did not persist (expected ${evaluation.expected}, got ${check.actual})`);
        } else {
            report.flagsNotWritable.push(`${evaluation.key}: server kept ${check.actual} after write`);
        }
    }
}

async function readClientConfig(transport: BaselineTransport): Promise<JsonRecord> {
    const res = await transport.request<unknown>('GET', '/api/v4/config/client?format=old');
    if (res.status >= 400 || !isRecord(res.data)) {
        throw new Error(`GET /api/v4/config/client failed (HTTP ${res.status})`);
    }
    return res.data;
}

/** Read-only: checks the server against the baseline, then waits for served client flags to match. */
export async function verifyBaseline(transport: BaselineTransport, opts: VerifyOptions): Promise<BaselineReport> {
    const report = emptyReport();
    const host = serverHost(opts.serverUrl);
    const targets = buildTargets(opts.only);
    const snapshot = await readSnapshot(transport);

    const evaluations = targets.map((target) => evaluate(target, snapshot, host));
    const plugins: {installed?: Set<string>} = {};
    for (const evaluation of evaluations) {
        // eslint-disable-next-line no-await-in-loop -- reads the plugin list at most once
        const hiddenPlugin = evaluation.matches ? undefined : await uninstalledPluginOf(transport, evaluation.segments, plugins);
        if (!evaluation.supported) {
            report.unsupported.push(evaluation.key);
        } else if (evaluation.pinned) {
            recordPinned(evaluation, report);
        } else if (evaluation.matches) {
            report.alreadyOk.push(evaluation.key);
        } else if (evaluation.kind === 'flag') {
            report.flagsNotWritable.push(`${evaluation.key}: server reports ${evaluation.actual}, baseline ${evaluation.expected}`);
        } else if (hiddenPlugin) {
            // Plugin install failures are warnings in provisioning; only the specs using the plugin fail.
            report.info.push(`${evaluation.key}: ${hiddenPlugin} is not installed, so its settings cannot be checked`);
        } else if (evaluation.owner === 'maestro') {
            report.info.push(`maestro-owned drift: ${evaluation.key} expected ${evaluation.expected}, got ${evaluation.actual}`);
        } else {
            report.failed.push(`${evaluation.key}: expected ${evaluation.expected}, got ${evaluation.actual}`);
        }
    }

    const flagsAtBaseline = evaluations.filter((evaluation) => evaluation.kind === 'flag' && evaluation.matches);
    if (flagsAtBaseline.length > 0) {
        await checkClientFlags(transport, flagsAtBaseline, opts, report);
    }

    return finalize(report);
}

/** Polls the client config until clients see every flag at its baseline value, or the poll budget ends. */
async function checkClientFlags(
    transport: BaselineTransport,
    flags: Evaluation[],
    opts: VerifyOptions,
    report: BaselineReport,
): Promise<void> {
    const timeoutMs = opts.clientPollTimeoutMs ?? CLIENT_POLL_TIMEOUT_MS;
    const intervalMs = opts.clientPollIntervalMs ?? CLIENT_POLL_INTERVAL_MS;
    const sleep = opts.sleep ?? defaultSleep;
    const attempts = Math.floor(timeoutMs / intervalMs) + 1;

    try {
        let pending: Array<{key: string; clientValue: unknown; expected: string}> = [];
        for (let attempt = 1; attempt <= attempts; attempt++) {
            // eslint-disable-next-line no-await-in-loop -- propagation polling
            const client = await readClientConfig(transport);
            pending = flags.
                filter((evaluation) => String(client[`FeatureFlag${evaluation.flagName ?? ''}`]) !== String(evaluation.desired)).
                map((evaluation) => ({key: evaluation.key, clientValue: client[`FeatureFlag${evaluation.flagName ?? ''}`], expected: String(evaluation.desired)}));
            if (pending.length === 0 || attempt === attempts) {
                break;
            }

            // eslint-disable-next-line no-await-in-loop -- propagation polling
            await sleep(intervalMs);
        }

        for (const item of pending) {
            report.failed.push(`${item.key}: client reports ${String(item.clientValue)} while server is ${item.expected} (not propagated within ${timeoutMs}ms)`);
        }
    } catch (error) {
        report.failed.push(`client config unavailable for flag propagation check: ${errorMessage(error)}`);
    }
}

/** Read-only per-key status, used by assertions that need expected and actual values. */
export async function inspectBaselineKeys(
    transport: BaselineTransport,
    opts: {serverUrl: string; keys?: readonly string[]},
): Promise<BaselineKeyStatus[]> {
    const host = serverHost(opts.serverUrl);
    const snapshot = await readSnapshot(transport);
    return buildTargets(opts.keys).map((target) => {
        const evaluation = evaluate(target, snapshot, host);
        return {
            key: evaluation.key,
            expected: evaluation.expected,
            actual: evaluation.actual,
            supported: evaluation.supported,
            pinned: evaluation.pinned,
            matches: evaluation.matches,
        };
    });
}

/** True when the key is a baseline config path or `FeatureFlags.<Name>` of a baseline flag. */
export function isBaselineKey(key: string): boolean {
    if (key.startsWith('FeatureFlags.')) {
        return hasOwn(FEATURE_FLAG_BASELINE, key.slice('FeatureFlags.'.length));
    }
    return hasOwn(CONFIG_BASELINE, key);
}

/** Compact multi-line summary of a report, for logs and thrown errors. */
export function formatBaselineReport(report: BaselineReport): string {
    const counts = [
        `applied=${report.applied.length}`,
        `alreadyOk=${report.alreadyOk.length}`,
        `pinnedOk=${report.pinnedOk.length}`,
        `pinnedMismatch=${report.pinnedMismatch.length}`,
        `unsupported=${report.unsupported.length}`,
        `flagsNotWritable=${report.flagsNotWritable.length}`,
        `failed=${report.failed.length}`,
    ];
    const lines = [`server baseline ${report.ok ? 'OK' : 'NOT OK'}: ${counts.join(' ')}`];

    const sections: Array<[string, string[]]> = [
        ['failed', report.failed],
        ['pinnedMismatch', report.pinnedMismatch],
        ['flagsNotWritable', report.flagsNotWritable],
        ['unsupported', report.unsupported],
        ['info', report.info],
    ];
    for (const [label, items] of sections) {
        if (items.length > 0) {
            lines.push(`  ${label}: ${items.join('; ')}`);
        }
    }

    const cleanup = Object.entries(report.cleanup).map(([label, count]) => `${label}=${count}`);
    if (cleanup.length > 0) {
        lines.push(`  cleanup: ${cleanup.join(' ')}`);
    }

    return lines.join('\n');
}
