// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    FIELD_NAME,
    GROUP_NAME,
    LINKED_FIELD_NAME,
    LINKED_OBJECT_TYPE,
    OBJECT_TYPE,
    SYSTEM_FIELD_TARGET_ID,
    TARGET_ID,
    TARGET_TYPE,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import {registerGroupName, setPropertyFields, setSystemPropertyValues} from '@store/system_property_store';
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

        const templateField = templateFields.find(
            (f: PropertyField) => f.object_type === OBJECT_TYPE && f.name === FIELD_NAME && f.delete_at === 0,
        );

        const linkedField = linkedFields.find(
            (f: PropertyField) => f.object_type === LINKED_OBJECT_TYPE && f.name === LINKED_FIELD_NAME && f.linked_field_id && f.delete_at === 0,
        );

        const allFields: PropertyField[] = [];
        if (templateField) {
            allFields.push(templateField);
        }
        if (linkedField) {
            allFields.push(linkedField);
        }

        const groupId = templateFields[0]?.group_id || linkedFields[0]?.group_id || templateField?.group_id || linkedField?.group_id;
        if (!groupId) {
            return {};
        }

        registerGroupName(serverUrl, GROUP_NAME, groupId);

        const values = await client.getSystemPropertyValues<string>(GROUP_NAME);

        setPropertyFields(serverUrl, groupId, allFields);
        setSystemPropertyValues(serverUrl, groupId, values);

        return {};
    } catch (error) {
        logDebug('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        return {error};
    }
}
