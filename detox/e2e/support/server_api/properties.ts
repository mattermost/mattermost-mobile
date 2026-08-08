// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';

import client from './client';
import {getResponseFromError} from './common';
import User from './user';

const GROUP_NAME = 'access_control';
const OBJECT_TYPE = 'template';
const TARGET_TYPE = 'system';
const FIELD_NAME = 'classification';
const LINKED_FIELD_NAME = 'classification';
const LINKED_OBJECT_TYPE = 'system';
const DISPLAY_BANNER_TOP = 'display_banner_top';

// Match Playwright classification_markings helpers: permission "admin" (not "sysadmin").
const ADMIN_PERMISSION = 'admin';

// Server model.IsValidId requires exactly 26 alphanumeric characters.
// Playwright uses padded IDs like lvlsecret00000000000000000 — same constraint.
export const CLASSIFICATION_LEVEL_IDS = {
    topSecret: 'lvltopsecret00000000000000',
    secret: 'lvlsecret00000000000000000',
    unclassified: 'lvlunclassified00000000000',
} as const;

type PropertyFieldOption = {
    id: string;
    name: string;
    color: string;
    rank?: number;
};

const DEFAULT_CLASSIFICATION_LEVELS: PropertyFieldOption[] = [
    {id: CLASSIFICATION_LEVEL_IDS.topSecret, name: 'TOP SECRET', color: '#FCE83A', rank: 1},
    {id: CLASSIFICATION_LEVEL_IDS.secret, name: 'SECRET', color: '#FF0000', rank: 2},
    {id: CLASSIFICATION_LEVEL_IDS.unclassified, name: 'UNCLASSIFIED', color: '#00FF00', rank: 3},
];

/**
 * Get all property fields for a group/objectType.
 */
export const apiGetPropertyFields = async (baseUrl: string, groupName: string, objectType: string, targetType: string, targetId?: string) => {
    try {
        let url = `${baseUrl}/api/v4/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        if (targetId !== undefined) {
            url += `&target_id=${encodeURIComponent(targetId)}`;
        }
        const response = await client.get(url);
        return {fields: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a property field.
 */
export const apiCreatePropertyField = async (baseUrl: string, groupName: string, objectType: string, field: Record<string, unknown>) => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/properties/groups/${groupName}/${objectType}/fields`,
            field,
        );
        return {field: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a property field.
 */
export const apiDeletePropertyField = async (baseUrl: string, groupName: string, objectType: string, fieldId: string) => {
    try {
        await client.delete(`${baseUrl}/api/v4/properties/groups/${groupName}/${objectType}/fields/${fieldId}`);
        return {};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get property values for a target.
 */
export const apiGetPropertyValues = async (baseUrl: string, groupName: string, objectType: string, targetId: string) => {
    try {
        const response = await client.get(
            `${baseUrl}/api/v4/properties/groups/${groupName}/${objectType}/values/${targetId}`,
        );
        return {values: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Upsert property values for a target.
 */
export const apiPatchPropertyValues = async (baseUrl: string, groupName: string, objectType: string, targetId: string, values: Array<{field_id: string; value: string}>) => {
    try {
        const response = await client.patch(
            `${baseUrl}/api/v4/properties/groups/${groupName}/${objectType}/values/${targetId}`,
            values,
        );
        return {values: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get system-scoped property values.
 */
export const apiGetSystemPropertyValues = async (baseUrl: string, groupName: string) => {
    try {
        const response = await client.get(
            `${baseUrl}/api/v4/properties/groups/${groupName}/system/values`,
        );
        return {values: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Upsert system-scoped property values.
 */
export const apiPatchSystemPropertyValues = async (baseUrl: string, groupName: string, values: Array<{field_id: string; value: string}>) => {
    try {
        const response = await client.patch(
            `${baseUrl}/api/v4/properties/groups/${groupName}/system/values`,
            values,
        );
        return {values: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Setup a complete classification system for E2E testing:
 * 1. Create a template property field with classification levels
 * 2. Create a linked system classification field with banner actions
 * 3. Set a system property value for the classification level
 *
 * Levels are identified by their `id` field. The `levelId` option selects which
 * level the global banner should display, matching Playwright webapp E2E
 * (keyed by option ID, not name). Option IDs must be valid Mattermost IDs
 * (exactly 26 alphanumeric characters).
 *
 * @returns Object containing the created field IDs and option IDs keyed by name
 */
export const apiSetupClassificationWithBanner = async (
    baseUrl: string,
    options?: {
        levels?: PropertyFieldOption[];
        levelId?: string;
        user?: {
            newUser: {
                username: string;
                password: string;
            };
        };
    },
) => {
    const levels = options?.levels ?? DEFAULT_CLASSIFICATION_LEVELS;
    const levelId = options?.levelId ?? CLASSIFICATION_LEVEL_IDS.topSecret;

    await apiCleanupClassification(baseUrl);

    // Match Playwright: type rank, no CPA "managed" attr, permission "admin".
    const templateResult = await apiCreatePropertyField(baseUrl, GROUP_NAME, OBJECT_TYPE, {
        name: FIELD_NAME,
        type: 'rank',
        target_type: TARGET_TYPE,
        target_id: '',
        attrs: {
            options: levels.map((l) => ({id: l.id, name: l.name, color: l.color, rank: l.rank})),
        },
        permission_field: ADMIN_PERMISSION,
        permission_values: ADMIN_PERMISSION,
        permission_options: ADMIN_PERMISSION,
    });

    const templateResult_ = templateResult as {field?: any; error?: unknown};
    if (!templateResult_.field) {
        throw new Error(`Failed to create template classification field: ${JSON.stringify(templateResult_.error ?? templateResult)}`);
    }

    const templateField = templateResult_.field;
    const templateOptions: PropertyFieldOption[] = templateField.attrs?.options ?? [];
    const selectedOption = templateOptions.find((o) => o.id === levelId);
    if (!selectedOption) {
        const available = templateOptions.map((o) => `${o.name} (${o.id})`).join(', ');
        throw new Error(`Classification level ID "${levelId}" not found in created options. Available: [${available}]`);
    }

    const optionIdsByName = Object.fromEntries(templateOptions.map((o) => [o.name, o.id]));

    // type/options/permissions are inherited from the template by the server.
    const linkedResult = await apiCreatePropertyField(baseUrl, GROUP_NAME, LINKED_OBJECT_TYPE, {
        name: LINKED_FIELD_NAME,
        type: 'rank',
        target_type: TARGET_TYPE,
        target_id: '',
        linked_field_id: templateField.id,
        attrs: {
            actions: [DISPLAY_BANNER_TOP],
        },
    });

    const linkedResult_ = linkedResult as {field?: any; error?: unknown};
    if (!linkedResult_.field) {
        throw new Error(`Failed to create linked system classification field: ${JSON.stringify(linkedResult_.error ?? linkedResult)}`);
    }

    const linkedField = linkedResult_.field;

    const patchResult = await apiPatchSystemPropertyValues(baseUrl, GROUP_NAME, [
        {field_id: linkedField.id, value: selectedOption.id},
    ]);
    if ('error' in patchResult) {
        throw new Error(`Failed to set system property value for field_id=${linkedField.id}, value=${selectedOption.id}: ${JSON.stringify(patchResult.error)}`);
    }

    const checkLinkedVisible = async (): Promise<string | undefined> => {
        const verify = await apiGetPropertyFields(baseUrl, GROUP_NAME, LINKED_OBJECT_TYPE, TARGET_TYPE, '') as {fields?: any[]; error?: unknown};
        const visibleLinked = (verify.fields ?? []).filter(
            (f) => f.name === LINKED_FIELD_NAME && f.delete_at === 0 && f.linked_field_id && f.id === linkedField.id,
        );
        if (visibleLinked.length === 0) {
            return `linked system field ${linkedField.id} not returned by GET ` +
                `/properties/groups/${GROUP_NAME}/${LINKED_OBJECT_TYPE}/fields?target_type=${TARGET_TYPE}&target_id=. ` +
                `Response: ${JSON.stringify(verify)}`;
        }
        const linkedOptions = (visibleLinked[0].attrs?.options as PropertyFieldOption[] | undefined) ?? [];
        if (!linkedOptions.some((o) => o.id === selectedOption.id)) {
            return `linked field missing selected option ${selectedOption.id}. options=${JSON.stringify(linkedOptions)}`;
        }

        const verifyValues = await apiGetSystemPropertyValues(baseUrl, GROUP_NAME) as {values?: any[]; error?: unknown};
        const linkedValue = (verifyValues.values ?? []).find((v) => v.field_id === linkedField.id);
        if (!linkedValue) {
            return `no system property value for linked field ${linkedField.id} from GET ` +
                `/properties/groups/${GROUP_NAME}/system/values. Response: ${JSON.stringify(verifyValues)}`;
        }
        if (linkedValue.value !== selectedOption.id) {
            return `system property value for linked field ${linkedField.id} is ` +
                `${JSON.stringify(linkedValue.value)}, expected ${selectedOption.id}`;
        }
        return undefined;
    };

    const pollLinkedVisible = async (sessionLabel: string, maxAttempts = 20) => {
        let lastError: string | undefined;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // eslint-disable-next-line no-await-in-loop -- sequential poll until propagated
            lastError = await checkLinkedVisible();
            if (!lastError) {
                return;
            }
            if (attempt < maxAttempts - 1) {
                // eslint-disable-next-line no-await-in-loop
                await wait(timeouts.TWO_SEC);
            }
        }
        throw new Error(`apiSetupClassificationWithBanner (${sessionLabel}): ${lastError}`);
    };

    await pollLinkedVisible('admin');

    if (options?.user) {
        const loginResult = await User.apiLogin(baseUrl, options.user.newUser) as {error?: unknown};
        if (loginResult.error) {
            throw new Error(`apiSetupClassificationWithBanner: test user login failed: ${JSON.stringify(loginResult.error)}`);
        }

        // Always restore the admin session, but never let a restore failure mask the
        // polling error that caused it.
        let pollError: unknown;
        try {
            await pollLinkedVisible('test user');
        } catch (error) {
            pollError = error;
        }

        const adminLoginResult = await User.apiAdminLogin(baseUrl) as {error?: unknown};
        if (pollError) {
            throw pollError;
        }
        if (adminLoginResult.error) {
            throw new Error(`apiSetupClassificationWithBanner: failed to restore admin session: ${JSON.stringify(adminLoginResult.error)}`);
        }
    }

    return {
        templateFieldId: templateField.id,
        linkedFieldId: linkedField.id,
        selectedOptionId: selectedOption.id,
        optionIdsByName,
    };
};

/**
 * Clean up classification property fields and values.
 */
export const apiCleanupClassification = async (baseUrl: string) => {
    const {error: adminLoginError} = await User.apiAdminLogin(baseUrl);
    if (adminLoginError) {
        throw new Error(`apiCleanupClassification: admin login failed: ${JSON.stringify(adminLoginError)}`);
    }

    // Channel linked fields first (channel classification tests), then system, then template.
    // Sequential: dependents must be deleted before the template (enforced below).
    for (const objectType of ['channel', LINKED_OBJECT_TYPE, 'user'] as const) {
        // eslint-disable-next-line no-await-in-loop -- order matters across object types
        const fieldsResult = await apiGetPropertyFields(baseUrl, GROUP_NAME, objectType, TARGET_TYPE) as {fields?: any[]};
        if (!fieldsResult.fields) {
            continue;
        }
        for (const field of fieldsResult.fields) {
            if (field.name === LINKED_FIELD_NAME && field.delete_at === 0) {
                // eslint-disable-next-line no-await-in-loop
                await apiDeletePropertyField(baseUrl, GROUP_NAME, objectType, field.id);
            }
        }
    }

    const templateFieldsResult = await apiGetPropertyFields(baseUrl, GROUP_NAME, OBJECT_TYPE, TARGET_TYPE) as {fields?: any[]};
    if (templateFieldsResult.fields) {
        for (const field of templateFieldsResult.fields) {
            if (field.name === FIELD_NAME && field.delete_at === 0) {
                // eslint-disable-next-line no-await-in-loop
                await apiDeletePropertyField(baseUrl, GROUP_NAME, OBJECT_TYPE, field.id);
            }
        }
    }
};

export const Properties = {
    CLASSIFICATION_LEVEL_IDS,
    apiGetPropertyFields,
    apiCreatePropertyField,
    apiDeletePropertyField,
    apiGetPropertyValues,
    apiPatchPropertyValues,
    apiGetSystemPropertyValues,
    apiPatchSystemPropertyValues,
    apiSetupClassificationWithBanner,
    apiCleanupClassification,
};

export default Properties;
