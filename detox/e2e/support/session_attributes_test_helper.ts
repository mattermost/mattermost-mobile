// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Properties} from '@support/server_api';

// Session attribute fields are seeded by the server and can only be patched (never created or
// deleted), so suites enable the ones they need and restore them afterwards.
const GROUP_NAME = 'session_attributes';
const OBJECT_TYPE = 'session';
const TARGET_TYPE = 'system';

type SessionAttributeAttrs = {
    enabled: boolean;
    ttl_seconds: number;
    grace_period_seconds: number;
};

type SessionAttributeField = {
    id: string;
    name: string;
    attrs: SessionAttributeAttrs;
};

/**
 * Enable a session attribute field with the given ttl and grace period. Session attributes are
 * server-wide, so the spec doing this must be routed to its own server (server_mutation_specs.json).
 * Returns a function that puts the field back the way it was.
 */
export const enableSessionAttribute = async (
    baseUrl: string,
    name: string,
    {ttlSeconds, gracePeriodSeconds}: {ttlSeconds: number; gracePeriodSeconds: number},
): Promise<() => Promise<void>> => {
    const {fields, error} = await Properties.apiGetPropertyFields(baseUrl, GROUP_NAME, OBJECT_TYPE, TARGET_TYPE) as {fields?: SessionAttributeField[]; error?: unknown};
    if (error || !fields) {
        throw new Error(`Failed to list session attribute fields: ${JSON.stringify(error)}`);
    }
    const field = fields.find((f) => f.name === name);
    if (!field) {
        throw new Error(`The "${name}" session attribute is missing; it is seeded by the server migration`);
    }

    const patchAttrs = async (attrs: SessionAttributeAttrs) => {
        const {error: patchError} = await Properties.apiPatchPropertyField(baseUrl, GROUP_NAME, OBJECT_TYPE, field.id, {attrs}) as {error?: unknown};
        if (patchError) {
            throw new Error(`Failed to update the "${name}" session attribute: ${JSON.stringify(patchError)}`);
        }
    };

    const original: SessionAttributeAttrs = {
        enabled: field.attrs.enabled,
        ttl_seconds: field.attrs.ttl_seconds,
        grace_period_seconds: field.attrs.grace_period_seconds,
    };
    await patchAttrs({enabled: true, ttl_seconds: ttlSeconds, grace_period_seconds: gracePeriodSeconds});

    return () => patchAttrs(original);
};
