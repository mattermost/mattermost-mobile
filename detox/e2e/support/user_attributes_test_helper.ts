// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CustomProfileAttributes, System, User} from '@support/server_api';
import {safeEnableSynchronization, timeouts, wait, waitForElementToExist} from '@support/utils';

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

export const ensureCustomProfileAttributesFeatureFlag = async (siteOneUrl: string): Promise<string | undefined> => {
    const ready = await waitForCustomProfileAttributesClientFlag(siteOneUrl);
    if (ready) {
        return undefined;
    }

    const {config: latestConfig} = await System.apiGetClientConfigOld(siteOneUrl);
    return (
        `FeatureFlagCustomProfileAttributes is "${latestConfig?.FeatureFlagCustomProfileAttributes ?? 'missing'}". ` +
        'Cloud Spinwick installations must set MM_FEATUREFLAGS_CUSTOMPROFILEATTRIBUTES=true in Matterwick PriorityEnv'
    );
};

const buildFieldIdByName = (fields: CustomProfileField[] | undefined): Map<string, string> => {
    const byName = new Map<string, string>();
    for (const field of fields ?? []) {
        if (field?.name && field?.id) {
            byName.set(field.name, field.id);
        }
    }
    return byName;
};

const ensureUserAttributeFields = async (siteOneUrl: string): Promise<string | undefined> => {
    const {fields, error: listError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
    if (listError) {
        return `Could not list custom profile fields: ${JSON.stringify(listError)}`;
    }

    const byName = buildFieldIdByName(fields as CustomProfileField[]);

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

const resolveUserAttributeFieldIds = (fields: CustomProfileField[]): UserAttributesFieldIds | undefined => {
    const byName = buildFieldIdByName(fields);
    const missing = USER_ATTRIBUTE_FIELD_NAMES.filter((name) => !byName.has(name));
    if (missing.length > 0) {
        return undefined;
    }

    return USER_ATTRIBUTE_FIELD_NAMES.map((name) => byName.get(name) ?? '') as UserAttributesFieldIds;
};

export const probeUserAttributesProvision = async (siteOneUrl: string): Promise<UserAttributesSetupResult> => {
    await User.apiAdminLogin(siteOneUrl);

    const {fields: existingFields, error: listError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
    if (!listError) {
        const existingIds = resolveUserAttributeFieldIds(existingFields as CustomProfileField[]);
        if (existingIds) {
            // CI 28495858512: fields may exist from provisioning but the feature
            // flag may not be enabled in client config. Always verify the flag.
            const flagError = await ensureCustomProfileAttributesFeatureFlag(siteOneUrl);
            if (flagError) {
                return {ready: false, reason: flagError};
            }
            return {ready: true, fieldIds: existingIds};
        }
    }

    const flagError = await ensureCustomProfileAttributesFeatureFlag(siteOneUrl);
    if (flagError) {
        return {ready: false, reason: flagError};
    }

    const fieldsError = await ensureUserAttributeFields(siteOneUrl);
    if (fieldsError) {
        return {ready: false, reason: fieldsError};
    }

    const {fields, error: finalListError} = await CustomProfileAttributes.apiListCustomProfileAttributeFields(siteOneUrl);
    if (finalListError) {
        return {ready: false, reason: `Could not list custom profile fields: ${JSON.stringify(finalListError)}`};
    }

    const fieldIds = resolveUserAttributeFieldIds(fields as CustomProfileField[]);
    if (!fieldIds) {
        const byName = buildFieldIdByName(fields as CustomProfileField[]);
        const missing = USER_ATTRIBUTE_FIELD_NAMES.filter((name) => !byName.has(name));
        return {ready: false, reason: `Missing provisioned fields: ${missing.join(', ')}`};
    }

    return {ready: true, fieldIds};
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

const customAttributeFieldContainerMatcher = (fieldName: string) =>
    by.id(/^edit_profile_form\.customAttributes\.[^.]+$/).withDescendant(by.text(fieldName));

export const getCustomAttributeInputByName = (fieldName: typeof USER_ATTRIBUTE_FIELD_NAMES[number]) =>
    element(
        by.id(/^edit_profile_form\.customAttributes\.[^.]+\.input$/).
            withAncestor(customAttributeFieldContainerMatcher(fieldName)),
    );

export const waitForEditProfileCustomAttributes = async (): Promise<void> => {
    const scrollView = element(by.id('edit_profile.scroll_view'));
    const firstInput = getCustomAttributeInputByName(USER_ATTRIBUTE_FIELD_NAMES[0]);

    await device.disableSynchronization();
    try {
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < 15; attempt++) {
            try {
                await waitForElementToExist(firstInput, timeouts.TWO_SEC);
                return;
            } catch {
                try {
                    await scrollView.scroll(200, 'down');
                } catch {
                    // Already at scroll end
                }
                await wait(timeouts.HALF_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
        await waitForElementToExist(firstInput, timeouts.TEN_SEC);
    } finally {
        await safeEnableSynchronization();
    }
};

export const scrollProfileAttributeIntoView = async (
    fieldName: typeof USER_ATTRIBUTE_FIELD_NAMES[number],
): Promise<void> => {
    const titleEl = element(by.text(fieldName).withAncestor(by.id('user_profile.custom_attributes.list')));
    const scrollView = element(by.id('user_profile.scroll_view'));

    await device.disableSynchronization();
    try {
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < 15; attempt++) {
            try {
                await waitForElementToExist(titleEl, timeouts.TWO_SEC);
                return;
            } catch {
                try {
                    await scrollView.scroll(200, 'down');
                } catch {
                    try {
                        await element(by.id('user_profile.screen')).swipe('up', 'slow', 0.5);
                    } catch {
                        // Already at scroll end
                    }
                }
                await wait(timeouts.HALF_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */
        await waitForElementToExist(titleEl, timeouts.TEN_SEC);
    } finally {
        await safeEnableSynchronization();
    }
};
