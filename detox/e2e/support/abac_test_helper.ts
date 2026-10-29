// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AccessControl} from '@support/server_api';
import {assertServerBaseline} from '@support/server_baseline';

// Server state the ABAC suites rely on; provisioning sets it, the suites only check it.
const ABAC_BASELINE_KEYS = [
    'FeatureFlags.PermissionPolicies',
    'FeatureFlags.ChannelPermissionPolicies',
    'AccessControlSettings.EnableAttributeBasedAccessControl',
    'AccessControlSettings.EnableUserManagedAttributes',
    'ServiceSettings.AllowCorsFrom',
];

export const assertAbacBaseline = (baseUrl: string) => assertServerBaseline(baseUrl, ABAC_BASELINE_KEYS);

/**
 * The provisioned "Department" profile attribute. Shared by every ABAC suite, so suites must never
 * create or delete it themselves.
 */
export const getProvisionedDepartmentField = async (baseUrl: string): Promise<{id: string; name: string}> => {
    const {fields, error} = await AccessControl.apiGetCustomProfileAttributeFields(baseUrl);
    if (error) {
        throw new Error(`Failed to list profile attribute fields: ${JSON.stringify(error)}`);
    }
    const field = (fields as Array<{id: string; name: string; delete_at?: number}>).find((f) => f.name === 'Department' && !f.delete_at);
    if (!field) {
        throw new Error('The "Department" profile attribute is missing; provisioning must run first');
    }
    return field;
};

export const setDepartment = async (baseUrl: string, userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(baseUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};
