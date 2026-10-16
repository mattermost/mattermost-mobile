// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** Role of SITE_1 for this shard in CI: 'pool' (shared, read-only) or 'mutation' (one serial shard). */
export const serverRole = process.env.E2E_SERVER_ROLE || 'local';

/** False on a CI pool shard. Mutation specs' afterAll checks it: Jest runs afterAll even when beforeAll threw. */
export const canMutateServer = process.env.CI !== 'true' || serverRole === 'mutation';

/**
 * Fails a spec that changes server-wide state when it lands on a pool shard. Routing comes from
 * detox/e2e/server_mutation_specs.json; a miss there must fail loudly, not run on a shared server.
 */
export const requireMutationServer = (specName: string) => {
    if (!canMutateServer) {
        throw new Error(`${specName} changes server-wide state and must run on the mutation shard (E2E_SERVER_ROLE=${serverRole}); add it to detox/e2e/server_mutation_specs.json`);
    }
};
