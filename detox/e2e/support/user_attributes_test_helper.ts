// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CustomProfileAttributes, System, User} from '@support/server_api';

// Keep in sync with detox/provision/custom-profile-attributes.ts
export const USER_ATTRIBUTE_FIELD_NAMES = ['Bio', 'Department', 'Team'] as const;

export type UserAttributesFieldIds = [string, string, string];

export type UserAttributesSetupResult =
    | {ready: true; fieldIds: UserAttributesFieldIds}
    | {ready: false; reason: string};

type CustomProfileField = {id?: string; name?: string};

export const probeUserAttributesProvision = async (siteOneUrl: string): Promise<UserAttributesSetupResult> => {
    await User.apiAdminLogin(siteOneUrl);

    const {config, error: configError} = await System.apiGetClientConfigOld(siteOneUrl);
    if (configError) {
        return {ready: false, reason: `Could not read client config: ${JSON.stringify(configError)}`};
    }

    if (config?.FeatureFlagCustomProfileAttributes !== 'true') {
        return {
            ready: false,
            reason: `FeatureFlagCustomProfileAttributes is "${config?.FeatureFlagCustomProfileAttributes ?? 'missing'}" — re-run provision`,
        };
    }

    const {fields, error: listError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
    if (listError) {
        return {ready: false, reason: `Could not list custom profile fields: ${JSON.stringify(listError)}`};
    }

    const byName = new Map<string, string>();
    for (const field of (fields as CustomProfileField[]) ?? []) {
        if (field?.name && field?.id) {
            byName.set(field.name, field.id);
        }
    }

    const missing = USER_ATTRIBUTE_FIELD_NAMES.filter((name) => !byName.has(name));
    if (missing.length > 0) {
        return {ready: false, reason: `Missing provisioned fields: ${missing.join(', ')}`};
    }

    const fieldIds = USER_ATTRIBUTE_FIELD_NAMES.map((name) => byName.get(name)!);
    return {ready: true, fieldIds: fieldIds as UserAttributesFieldIds};
};

export const seedUserAttributeValues = async (
    siteOneUrl: string,
    testUser: {username: string; password: string},
    fieldIds: UserAttributesFieldIds,
    values: UserAttributesFieldIds,
): Promise<{ok: true} | {ok: false; reason: string}> => {
    await User.apiLogin(siteOneUrl, testUser);

    const {error} = await CustomProfileAttributes.apiUpdateCustomProfileAttributeValues(siteOneUrl, {
        [fieldIds[0]]: values[0],
        [fieldIds[1]]: values[1],
        [fieldIds[2]]: values[2],
    });
    if (error) {
        return {ok: false, reason: `Failed to seed attribute values: ${JSON.stringify(error)}`};
    }

    return {ok: true};
};

export const assertUserAttributesReady = (reason: string | undefined): void => {
    if (reason) {
        throw new Error(`[user_attributes] ${reason}`);
    }
};
