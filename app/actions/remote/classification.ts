// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    GROUP_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
    SYSTEM_FIELD_TARGET_ID,
    TARGET_ID,
    TARGET_TYPE,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import {registerGroupName, removePropertyFieldById, updatePropertyField, updateSystemPropertyValues} from '@store/system_property_store';
import {logDebug} from '@utils/log';

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);

        const [templateFields, linkedFields] = await Promise.all([
            client.getPropertyFields(GROUP_NAME, OBJECT_TYPE, TARGET_TYPE, TARGET_ID),
            client.getPropertyFields(GROUP_NAME, LINKED_OBJECT_TYPE, TARGET_TYPE, SYSTEM_FIELD_TARGET_ID),
        ]);

        const allFields = [...templateFields, ...linkedFields];
        const groupId = allFields[0]?.group_id;
        if (!groupId) {
            return {};
        }

        registerGroupName(serverUrl, GROUP_NAME, groupId);

        // Merge field updates into the store so concurrent WS events aren't
        // clobbered by a stale API response. Soft-deleted fields are removed.
        for (const field of allFields) {
            if (field.delete_at > 0) {
                removePropertyFieldById(serverUrl, field.id);
            } else {
                updatePropertyField(serverUrl, field);
            }
        }

        const values = await client.getSystemPropertyValues<string>(GROUP_NAME);
        if (values.length > 0) {
            updateSystemPropertyValues(serverUrl, groupId, values);
        }

        return {};
    } catch (error) {
        logDebug('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        return {error};
    }
}
