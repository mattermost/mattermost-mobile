// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CustomProfileAttributes, System, User} from '@support/server_api';
import {timeouts, wait} from '@support/utils';

// Keep in sync with detox/provision/custom-profile-attributes.ts
export const USER_ATTRIBUTE_FIELD_NAMES = ['Bio', 'Department', 'Team'] as const;

export type UserAttributesFieldIds = [string, string, string];

export type UserAttributesSetupResult =
    | {ready: true; fieldIds: UserAttributesFieldIds}
    | {ready: false; reason: string};

type CustomProfileField = {id?: string; name?: string};

const waitForCustomProfileAttributesClientFlag = async (
    siteOneUrl: string,
    {maxAttempts = 30, intervalMs = timeouts.ONE_SEC} = {},
): Promise<boolean> => {
    /* eslint-disable no-await-in-loop -- poll until client flag propagates */
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const {config, error} = await System.apiGetClientConfigOld(siteOneUrl);
        if (error) {
            throw new Error(`Could not read client config: ${JSON.stringify(error)}`);
        }
        if (config?.FeatureFlagCustomProfileAttributes === 'true') {
            return true;
        }

        await wait(intervalMs);
    }
    /* eslint-enable no-await-in-loop */

    return false;
};

const ensureCustomProfileAttributesFeatureFlag = async (siteOneUrl: string): Promise<string | undefined> => {
    const {config, error: configError} = await System.apiGetClientConfigOld(siteOneUrl);
    if (configError) {
        return `Could not read client config: ${JSON.stringify(configError)}`;
    }

    if (config?.FeatureFlagCustomProfileAttributes === 'true') {
        return undefined;
    }

    const {error: patchError} = await System.apiUpdateConfig(siteOneUrl, {
        FeatureFlags: {CustomProfileAttributes: true},
    });
    if (patchError) {
        return `Failed to enable CustomProfileAttributes: ${JSON.stringify(patchError)}`;
    }

    let ready = await waitForCustomProfileAttributesClientFlag(siteOneUrl);
    if (ready) {
        return undefined;
    }

    // Plugin reloads can reset flags — re-apply via full config PUT (same as detox/provision).
    const {config: serverConfig, error: getConfigError} = await System.apiGetConfig(siteOneUrl);
    if (getConfigError || !serverConfig) {
        return `Could not read server config for CustomProfileAttributes retry: ${JSON.stringify(getConfigError)}`;
    }

    serverConfig.FeatureFlags = serverConfig.FeatureFlags || {};
    (serverConfig.FeatureFlags as Record<string, unknown>).CustomProfileAttributes = true;
    const {error: fullUpdateError} = await System.apiUpdateConfig(siteOneUrl, serverConfig);
    if (fullUpdateError) {
        return `Full config update for CustomProfileAttributes failed: ${JSON.stringify(fullUpdateError)}`;
    }

    ready = await waitForCustomProfileAttributesClientFlag(siteOneUrl, {maxAttempts: 60});
    if (ready) {
        return undefined;
    }

    const {config: latestConfig} = await System.apiGetClientConfigOld(siteOneUrl);
    return `FeatureFlagCustomProfileAttributes is "${latestConfig?.FeatureFlagCustomProfileAttributes ?? 'missing'}" after patch — server may block this flag`;
};

const ensureUserAttributeFields = async (siteOneUrl: string): Promise<string | undefined> => {
    const {fields, error: listError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
    if (listError) {
        return `Could not list custom profile fields: ${JSON.stringify(listError)}`;
    }

    const byName = new Map<string, string>();
    for (const field of (fields as CustomProfileField[]) ?? []) {
        if (field?.name && field?.id) {
            byName.set(field.name, field.id);
        }
    }

    /* eslint-disable no-await-in-loop -- create missing fields sequentially */
    for (const name of USER_ATTRIBUTE_FIELD_NAMES) {
        if (byName.has(name)) {
            continue;
        }

        const {error: createError} = await CustomProfileAttributes.apiCreateCustomProfileAttributeField(siteOneUrl, {name});
        if (createError) {
            return `Failed to create custom profile field "${name}": ${JSON.stringify(createError)}`;
        }
    }
    /* eslint-enable no-await-in-loop */

    return undefined;
};

export const probeUserAttributesProvision = async (siteOneUrl: string): Promise<UserAttributesSetupResult> => {
    await User.apiAdminLogin(siteOneUrl);

    const flagError = await ensureCustomProfileAttributesFeatureFlag(siteOneUrl);
    if (flagError) {
        return {ready: false, reason: flagError};
    }

    const fieldsError = await ensureUserAttributeFields(siteOneUrl);
    if (fieldsError) {
        return {ready: false, reason: fieldsError};
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
