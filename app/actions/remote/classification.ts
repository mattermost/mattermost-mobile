// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CLASSIFICATIONS_CHANNEL_OBJECT_TYPE,
    CLASSIFICATIONS_FIELD_TARGET_ID,
    CLASSIFICATIONS_FIELD_TARGET_TYPE,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
    CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import {registerGroupName, removePropertyFieldById, updatePropertyField, updatePropertyValues} from '@store/system_property_store';
import {logDebug} from '@utils/log';

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);

        const [templateFields, linkedFields, channelFields] = await Promise.all([
            client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_TEMPLATE_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
            client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
            client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_CHANNEL_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
        ]);

        const allFields = [...templateFields, ...linkedFields, ...channelFields];
        const groupId = allFields[0]?.group_id;
        if (!groupId) {
            return {};
        }

        registerGroupName(serverUrl, CLASSIFICATIONS_GROUP_NAME, groupId);

        for (const field of allFields) {
            if (field.delete_at > 0) {
                removePropertyFieldById(serverUrl, field.id);
            } else {
                updatePropertyField(serverUrl, field);
            }
        }

        const values = await client.getSystemPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME);
        if (values.length > 0) {
            updatePropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, groupId, values);
        }

        return {};
    } catch (error) {
        logDebug('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        return {error};
    }
}

export async function fetchChannelClassificationValue(serverUrl: string, channelId: string): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const values = await client.getPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_CHANNEL_OBJECT_TYPE, channelId);
        if (values.length > 0) {
            const groupId = values[0].group_id;
            updatePropertyValues(serverUrl, channelId, groupId, values);
        }
        return {};
    } catch {
        return {};
    }
}
