// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

const DEFAULT_FIELDS = ['Bio', 'Department', 'Team'];

type CustomProfileAttributeField = {id: string; name: string};

export async function ensureCustomProfileAttributeFields(client: MattermostClient, token: string): Promise<void> {
    const listRes = await client.request<CustomProfileAttributeField[]>(
        'GET',
        '/api/v4/custom_profile_attributes/fields',
        undefined,
        token,
    );
    if (listRes.status >= 400) {
        logWarn(`Could not list custom profile attribute fields (HTTP ${listRes.status}). User attribute tests may skip.`);
        return;
    }

    const existing = Array.isArray(listRes.data) ? listRes.data : [];
    const existingNames = new Set(existing.map((field) => field.name));

    /* eslint-disable no-await-in-loop -- create missing fields one at a time for clear logs */
    for (const name of DEFAULT_FIELDS) {
        if (existingNames.has(name)) {
            continue;
        }

        logInfo(`Creating custom profile attribute field: ${name}`);
        const createRes = await client.request(
            'POST',
            '/api/v4/custom_profile_attributes/fields',
            {name, type: 'text'},
            token,
        );
        if (createRes.status >= 400) {
            logWarn(`Failed to create custom profile attribute field "${name}" (HTTP ${createRes.status}).`);
        }
    }
    /* eslint-enable no-await-in-loop */
}
