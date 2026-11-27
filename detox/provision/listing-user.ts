// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createHmac} from 'node:crypto';

import {logInfo} from './log';

import type {MattermostClient} from './types';

/**
 * The listing user is a regular user that other workers sign in as when this server is their SITE_2 or SITE_3.
 * Its password is derived from the batch admin password and the server URL, so it is never stored, and a leak of
 * it (for instance, typed into the app in a Detox log) exposes no admin access. The e2e-test-stack-sites action
 * derives it the same way in listing-password.mjs.
 */
export const LISTING_USERNAME = 'e2e-listing';
export const LISTING_TEAM_NAME = 'e2e-listing';
const LISTING_EMAIL = 'e2e-listing@sample.mattermost.com';

// Meets any password policy: upper and lower case, a number and a symbol.
const PASSWORD_POLICY_SUFFIX = 'Aa1!';

export function listingUserPassword(adminPassword: string, serverUrl: string): string {
    const digest = createHmac('sha256', adminPassword).update(`mobile-e2e-listing-user:${serverUrl}`).digest('base64url');
    return `${digest.slice(0, 32)}${PASSWORD_POLICY_SUFFIX}`;
}

type IdResponse = {id?: string};

async function findOrCreate(
    client: MattermostClient,
    token: string,
    lookupPath: string,
    createPath: string,
    body: Record<string, unknown>,
    label: string,
): Promise<{id: string; created: boolean}> {
    const found = await client.request<IdResponse>('GET', lookupPath, undefined, token);
    if (found.status < 400 && found.data.id) {
        return {id: found.data.id, created: false};
    }
    if (found.status !== 404) {
        throw new Error(`Could not look up the listing ${label} (HTTP ${found.status})`);
    }
    const created = await client.request<IdResponse>('POST', createPath, body, token);
    if (created.status >= 400 || !created.data.id) {
        throw new Error(`Could not create the listing ${label} (HTTP ${created.status})`);
    }
    return {id: created.data.id, created: true};
}

async function expectOk(client: MattermostClient, token: string, method: 'POST' | 'PUT', requestPath: string, body: unknown, label: string) {
    const res = await client.request(method, requestPath, body, token);
    if (res.status >= 400) {
        throw new Error(`Could not ${label} (HTTP ${res.status})`);
    }
}

/** Creates the listing user in its own team, or resets an existing one to the derived password. */
export async function ensureListingUser(client: MattermostClient, token: string, adminPassword: string): Promise<void> {
    const password = listingUserPassword(adminPassword, client.serverUrl);

    const team = await findOrCreate(
        client,
        token,
        `/api/v4/teams/name/${LISTING_TEAM_NAME}`,
        '/api/v4/teams',
        {name: LISTING_TEAM_NAME, display_name: 'E2E Listing', type: 'O'},
        'team',
    );
    const user = await findOrCreate(
        client,
        token,
        `/api/v4/users/username/${LISTING_USERNAME}`,
        '/api/v4/users',
        {username: LISTING_USERNAME, email: LISTING_EMAIL, password},
        'user',
    );
    if (!user.created) {
        await expectOk(client, token, 'PUT', `/api/v4/users/${user.id}/password`, {new_password: password}, 'reset the listing user password');
    }
    await expectOk(client, token, 'POST', `/api/v4/users/${user.id}/email/verify/member`, undefined, 'verify the listing user email');
    await expectOk(client, token, 'POST', `/api/v4/teams/${team.id}/members`, {team_id: team.id, user_id: user.id}, 'add the listing user to its team');

    logInfo(`Listing user ready (${user.created ? 'created' : 'existing'}).`);
}
