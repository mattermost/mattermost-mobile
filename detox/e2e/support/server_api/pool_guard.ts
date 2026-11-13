// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Blocks server-wide writes from shards on the shared pool servers. Specs that must change
// server-wide state run on the mutation shard instead (detox/e2e/server_mutation_specs.json).

export type PoolGuardMode = 'off' | 'enforce';

type Env = Record<string, string | undefined>;

export const poolGuardMode = (env: Env = process.env): PoolGuardMode => {
    if (env.CI !== 'true' || env.E2E_SERVER_ROLE !== 'pool') {
        return 'off';
    }
    return env.E2E_POOL_GUARD === 'enforce' ? 'enforce' : 'off';
};

const originOf = (url?: string) => {
    if (!url) {
        return '';
    }
    try {
        return new URL(url).origin;
    } catch {
        return '';
    }
};

const protectedOrigins = (env: Env = process.env) => new Set(
    [env.SITE_1_URL, env.SITE_2_URL, env.SITE_3_URL].map(originOf).filter(Boolean),
);

const parseBody = (body: unknown): any => {
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch {
            return undefined;
        }
    }
    return body;
};

type Rule = {methods: string[]; path: RegExp; reason: string; allow?: (body: any, path: string) => boolean};

// Channel policies created through this guard; activating or deleting them stays channel-scoped.
const channelPolicyIds = new Set<string>();

type PolicyRequest = {type?: string; id?: string; entries?: Array<{id?: string}>} | undefined;

const isChannelPolicyCreate = (body: PolicyRequest) => {
    if (body?.type !== 'channel') {
        return false;
    }
    if (typeof body.id === 'string' && body.id) {
        channelPolicyIds.add(body.id);
    }
    return true;
};

const activatesOnlyChannelPolicies = (body: PolicyRequest) => {
    const entries = body?.entries;
    return Array.isArray(entries) && entries.length > 0 && entries.every((entry) => channelPolicyIds.has(entry?.id ?? ''));
};

const WRITE = ['post', 'put', 'patch', 'delete'];
const RULES: Rule[] = [
    {methods: WRITE, path: /^\/api\/v4\/config(\/patch|\/reload)?$/, reason: 'server config'},
    {methods: WRITE, path: /^\/api\/v4\/(license|trial-license)(\/|$)/, reason: 'license'},
    {methods: ['post'], path: /^\/api\/v4\/plugins(\/install_from_url|\/marketplace)?$/, reason: 'plugin install'},
    {methods: ['post', 'delete'], path: /^\/api\/v4\/plugins\/[^/]+(\/(enable|disable))?$/, reason: 'plugin state'},
    {methods: WRITE, path: /^\/api\/v4\/(roles\/[^/]+\/patch|schemes)(\/|$)/, reason: 'roles or schemes'},

    // A channel policy only affects its own channel; a permission policy applies server-wide even when team-scoped.
    {methods: ['put', 'post'], path: /^\/api\/v4\/access_control_policies$/, reason: 'access policy', allow: isChannelPolicyCreate},
    {methods: ['put'], path: /^\/api\/v4\/access_control_policies\/activate$/, reason: 'access policy activation', allow: activatesOnlyChannelPolicies},
    {methods: ['delete'], path: /^\/api\/v4\/access_control_policies\/[^/]+$/, reason: 'access policy delete', allow: (_, path) => channelPolicyIds.has(path.split('/').pop() ?? '')},
    {methods: WRITE, path: /^\/api\/v4\/custom_profile_attributes\/fields(\/|$)/, reason: 'profile attribute fields'},

    // Optional fields named with a suite-unique suffix (see channel_attributes_fixtures.ts) only show
    // where that suite sets a value; required or fixed-name fields affect every channel on the server.
    {methods: ['post', 'put', 'patch'], path: /^\/api\/v4\/properties\/groups\/[^/]+\/[^/]+\/fields(\/|$)/, reason: 'property fields', allow: (body) => body?.attrs?.required !== true && /_[0-9a-f]{6}$/.test(body?.name ?? '')},
    {methods: WRITE, path: /^\/api\/v4\/properties\/groups\/[^/]+\/system\/values(\/|$)/, reason: 'system property values'},
    {methods: WRITE, path: /^\/api\/v4\/remotecluster(\/|$)/, reason: 'remote clusters'},
    {methods: WRITE, path: /^\/api\/v4\/terms_of_service(\/|$)/, reason: 'terms of service'},
    {methods: WRITE, path: /^\/api\/v4\/ldap\/(sync|migrateid)(\/|$)/, reason: 'LDAP'},
];

/** Returns why a request writes server-wide state, or null when it is allowed on a pool server. */
export const classifyRequest = (method: string | undefined, url: string | undefined, body?: unknown, env: Env = process.env, baseURL?: string): string | null => {
    const m = (method || 'get').toLowerCase();
    if (!WRITE.includes(m) || !url) {
        return null;
    }
    let parsed: URL;
    try {
        parsed = new URL(url, baseURL);
    } catch {
        // A write we cannot place could be aimed at a pool server, so it is not let through unchecked.
        return `${m.toUpperCase()} ${url} (unresolvable URL)`;
    }
    if (!protectedOrigins(env).has(parsed.origin)) {
        return null;
    }

    // A site URL with a trailing slash yields "//api/v4/...", which the anchored rules would miss.
    const path = parsed.pathname.replace(/\/{2,}/g, '/');
    const rule = RULES.find((r) => r.methods.includes(m) && r.path.test(path));
    if (!rule || rule.allow?.(parseBody(body), path)) {
        return null;
    }
    return `${m.toUpperCase()} ${path} (${rule.reason})`;
};

const violations: string[] = [];

/** Returns and clears the violations recorded since the last call. */
export const drainPoolGuardViolations = () => violations.splice(0, violations.length);

/** Axios request interceptor. */
export const poolGuardInterceptor = <T extends {method?: string; url?: string; baseURL?: string; data?: unknown}>(config: T): T => {
    const mode = poolGuardMode();
    if (mode === 'off') {
        return config;
    }
    const violation = classifyRequest(config.method, config.url, config.data, process.env, config.baseURL);
    if (!violation) {
        return config;
    }
    violations.push(violation);
    // eslint-disable-next-line no-console
    console.error(`[pool_guard] server-wide write on a pool server: ${violation}`);
    throw Object.assign(new Error(`E2E_POOL_GUARD blocked ${violation}`), {code: 'E2E_POOL_GUARD'});
};
