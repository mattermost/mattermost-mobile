// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRandomId, wait, timeouts} from '@support/utils';
import axios from 'axios';

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

// Match webapp classification_markings utils + Playwright helpers:
// permission level "admin" (not "sysadmin"), no CPA "managed" attr.
const ADMIN_PERMISSION = 'admin';

// Server IsValidId requires exactly 26 alphanumeric characters (model.IsValidId).
const VALID_ID_LENGTH = 26;

type PropertyFieldOption = {
    id: string;
    name: string;
    color: string;
    rank?: number;
};

const DEFAULT_LEVEL_NAMES = {
    topSecret: 'TOP SECRET',
    secret: 'SECRET',
    unclassified: 'UNCLASSIFIED',
} as const;

const defaultClassificationLevels = (): PropertyFieldOption[] => [
    {id: getRandomId(VALID_ID_LENGTH), name: DEFAULT_LEVEL_NAMES.topSecret, color: '#FCE83A', rank: 1},
    {id: getRandomId(VALID_ID_LENGTH), name: DEFAULT_LEVEL_NAMES.secret, color: '#FF0000', rank: 2},
    {id: getRandomId(VALID_ID_LENGTH), name: DEFAULT_LEVEL_NAMES.unclassified, color: '#00FF00', rank: 3},
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
 * Option `id` values must be valid Mattermost IDs (26 alphanumeric chars).
 * Callers select the banner level by `levelName` (e.g. 'TOP SECRET'). Use the
 * returned `optionIdsByName` map when patching the selected value later.
 *
 * @returns Object containing the created field IDs and option IDs keyed by name
 */
export const apiSetupClassificationWithBanner = async (
    baseUrl: string,
    options?: {
        levels?: PropertyFieldOption[];
        levelName?: string;

        // The user whose session the app will use after reload. When provided, setup also polls the
        // property-fields endpoint AS this user (Bearer token) so it only returns once that session
        // can read the classification field — not just the admin session (see the app-user poll below).
        user?: {username?: string; password?: string; newUser?: {email?: string; username?: string; password?: string}};
    },
) => {
    const levels = options?.levels ?? defaultClassificationLevels();
    const levelName = options?.levelName ?? DEFAULT_LEVEL_NAMES.topSecret;

    // Shared axios cookie jar can be left on a non-admin session by earlier tests.
    const {error: adminLoginError} = await User.apiAdminLogin(baseUrl);
    if (adminLoginError) {
        throw new Error(`apiSetupClassificationWithBanner: admin login failed: ${JSON.stringify(adminLoginError)}`);
    }

    await apiCleanupClassification(baseUrl);

    // type/options/permissions match webapp saveCreateField (rank + admin).
    // Server copies type+options onto the linked system field at create time.
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
    const selectedOption = templateOptions.find((o) => o.name === levelName);
    if (!selectedOption) {
        const available = templateOptions.map((o) => `${o.name} (${o.id})`).join(', ');
        throw new Error(`Classification level name "${levelName}" not found in created options. Available: [${available}]`);
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

    // Poll the same list endpoint the mobile app uses until the linked field (and its selected
    // option) are readable. On cloud servers the config/property write propagates slowly (a config
    // PATCH alone can take ~30s), so a single GET right after create races propagation and the app's
    // post-reload fetch then logs "No classification fields returned". Polling here guarantees the
    // server has fully propagated before the test reloads the app.
    // NOTE: pass '' for target_id to mirror the app client exactly — app/client/rest/properties.ts
    // uses `if (targetId !== undefined)` and CLASSIFICATIONS_FIELD_TARGET_ID = '', so the app sends
    // `&target_id=`. The verify GET must send the identical URL or it proves nothing.
    const evaluateLinked = (fields: any[]): string | undefined => {
        const visibleLinked = fields.filter(
            (f) => f.name === LINKED_FIELD_NAME && f.delete_at === 0 && f.linked_field_id && f.id === linkedField.id,
        );
        if (visibleLinked.length === 0) {
            return `linked system field ${linkedField.id} not returned by GET ` +
                `/properties/groups/${GROUP_NAME}/${LINKED_OBJECT_TYPE}/fields?target_type=${TARGET_TYPE}&target_id=. ` +
                `Fields: ${JSON.stringify(fields)}`;
        }
        const linkedOptions = (visibleLinked[0].attrs?.options as PropertyFieldOption[] | undefined) ?? [];
        if (!linkedOptions.some((o) => o.id === selectedOption.id)) {
            return `linked field missing selected option ${selectedOption.id}. options=${JSON.stringify(linkedOptions)}`;
        }
        return undefined;
    };

    // Admin read via the shared cookie client.
    const fetchLinkedAsAdmin = async (): Promise<any[]> => {
        const verify = await apiGetPropertyFields(baseUrl, GROUP_NAME, LINKED_OBJECT_TYPE, TARGET_TYPE, '') as {fields?: any[]};
        return verify.fields ?? [];
    };

    // App-user read via a standalone Bearer-token request. Mirrors the mobile client exactly and
    // does not disturb the shared admin cookie jar (which the shared client re-logs-in as admin on 401).
    const fetchLinkedAsUser = (token: string) => async (): Promise<any[]> => {
        const url = `${baseUrl}/api/v4/properties/groups/${GROUP_NAME}/${LINKED_OBJECT_TYPE}/fields?target_type=${TARGET_TYPE}&target_id=`;
        const res = await axios.get(url, {headers: {Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest'}});
        return (res.data ?? []) as any[];
    };

    const pollLinkedVisible = async (label: string, fetchFields: () => Promise<any[]>, maxAttempts = 20) => {
        let lastError: string | undefined;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // eslint-disable-next-line no-await-in-loop -- sequential poll until propagated
                lastError = evaluateLinked(await fetchFields());
            } catch (err) {
                lastError = `fetch failed: ${JSON.stringify(getResponseFromError(err))}`;
            }
            if (!lastError) {
                return;
            }
            if (attempt < maxAttempts - 1) {
                // eslint-disable-next-line no-await-in-loop
                await wait(timeouts.TWO_SEC);
            }
        }
        throw new Error(`apiSetupClassificationWithBanner (${label}): ${lastError}`);
    };

    // First confirm the write is readable at all (admin session).
    await pollLinkedVisible('admin', fetchLinkedAsAdmin);

    // Then confirm it is readable by the SAME user session the app will use. System-scoped fields
    // are permitted to every authenticated user, but on a multi-node cloud server the write can be
    // visible to the admin session before the app user's session/read-replica has caught up — which
    // is exactly when the app's post-reload fetch returns an empty list and the banner never appears
    // (app logs "No classification fields returned"). Polling as the app user closes that gap before
    // the test reloads the app.
    if (options?.user) {
        const loginId = options.user.newUser?.email ?? options.user.newUser?.username ?? options.user.username;
        const password = options.user.newUser?.password ?? options.user.password;
        if (loginId && password) {
            const loginRes = await axios.post(
                `${baseUrl}/api/v4/users/login`,
                {login_id: loginId, password},
                {headers: {'X-Requested-With': 'XMLHttpRequest'}},
            );
            const token = (loginRes.headers.token ?? loginRes.headers.Token) as string | undefined;
            if (!token) {
                throw new Error('apiSetupClassificationWithBanner: login returned no Token header for app-user propagation poll');
            }
            await pollLinkedVisible('app-user', fetchLinkedAsUser(token));
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
