// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Role of SITE_1 on the Matterwick shards: 'pool' (shared, read-only) or 'mutation' (one serial shard).
 * Unset ('local') locally and on e2e-test-stack, where every worker owns its SITE_1.
 */
export const serverRole = process.env.E2E_SERVER_ROLE || 'local';

/**
 * Whether specs set up the server state they need (plugins, profile fields, lockout recovery). Locally and on the
 * v2 pipeline they do; on the legacy CI pipeline detox/provision owns that state and specs only verify it.
 * global_setup.js repeats this check.
 */
export const isSpecOwnedServerSetup = (env: Record<string, string | undefined> = process.env) =>
    env.CI !== 'true' || env.E2E_PIPELINE === 'v2';

export const specOwnsServerSetup = isSpecOwnedServerSetup();

/** False on a Matterwick pool shard. Mutation specs' afterAll checks it: Jest runs afterAll even when beforeAll threw. */
export const canMutateServer = serverRole !== 'pool';

/**
 * Fails a spec that must not run on a pool shard. Routing comes from detox/e2e/server_mutation_specs.json;
 * a miss there must fail loudly, not run on a shared server.
 */
export const requireMutationServer = (specName: string, reason = 'changes server-wide state') => {
    if (!canMutateServer) {
        throw new Error(`${specName} ${reason} and must run on the mutation shard (E2E_SERVER_ROLE=${serverRole}); add it to detox/e2e/server_mutation_specs.json`);
    }
};
