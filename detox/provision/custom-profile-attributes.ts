// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

const USER_ATTRIBUTE_FIELD_NAMES = ['Bio', 'Department', 'Team'] as const;

type CustomProfileAttributeField = {id: string; name: string};

export async function ensureCustomProfileAttributeFields(client: MattermostClient, token: string): Promise<boolean> {
    const listRes = await client.request<CustomProfileAttributeField[]>(
        'GET',
        '/api/v4/custom_profile_attributes/fields',
        undefined,
        token,
    );
    if (listRes.status >= 400) {
        logWarn(`Could not list custom profile attribute fields (HTTP ${listRes.status}).`);
        return false;
    }

    const existing = Array.isArray(listRes.data) ? listRes.data : [];
    const existingNames = new Set(existing.map((field) => field.name));

    /* eslint-disable no-await-in-loop */
    for (const name of USER_ATTRIBUTE_FIELD_NAMES) {
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
            logWarn(`Failed to create field "${name}" (HTTP ${createRes.status}).`);
        }
    }
    /* eslint-enable no-await-in-loop */

    const verifyRes = await client.request<CustomProfileAttributeField[]>(
        'GET',
        '/api/v4/custom_profile_attributes/fields',
        undefined,
        token,
    );
    if (verifyRes.status >= 400) {
        return false;
    }

    const verifiedNames = new Set((verifyRes.data ?? []).map((field) => field.name));
    const missing = USER_ATTRIBUTE_FIELD_NAMES.filter((name) => !verifiedNames.has(name));
    if (missing.length > 0) {
        logWarn(`Missing custom profile fields after provision: ${missing.join(', ')}`);
        return false;
    }

    logInfo('Custom profile attribute fields ready.');
    return true;
}
