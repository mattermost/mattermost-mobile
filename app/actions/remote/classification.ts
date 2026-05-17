// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CLASSIFICATIONS_CHANNEL_OBJECT_TYPE,
    CLASSIFICATIONS_FIELD_TARGET_ID,
    CLASSIFICATIONS_FIELD_TARGET_TYPE,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue} from '@queries/servers/system';
import {registerGroupName, setPropertyFields, updatePropertyValues} from '@store/system_property_store';
import {logDebug, logError} from '@utils/log';

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);

        const [systemFields, channelFields] = await Promise.all([
            client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
            client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_CHANNEL_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
        ]);

        const allFields = [...systemFields, ...channelFields];

        if (allFields.length === 0) {
            logDebug('fetchClassificationBanner', 'No classification fields returned');
            return {};
        }

        const groupId = allFields[0].group_id;
        if (!groupId || allFields.some((f) => f.group_id !== groupId)) {
            logError('fetchClassificationBanner', 'Unexpected classification fields', {allFields});
            return {};
        }

        registerGroupName(serverUrl, CLASSIFICATIONS_GROUP_NAME, groupId);

        const activeFields = allFields.filter((f) => f.delete_at === 0);
        setPropertyFields(serverUrl, groupId, activeFields);

        const values = await client.getSystemPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME);
        if (values.length > 0) {
            updatePropertyValues(serverUrl, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, groupId, values);
        }

        return {};
    } catch (error) {
        logError('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        return {error};
    }
}

export async function fetchChannelClassificationValue(serverUrl: string, channelId: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            return {};
        }

        const client = NetworkManager.getClient(serverUrl);
        const values = await client.getPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_CHANNEL_OBJECT_TYPE, channelId);

        if (values.length === 0) {
            logDebug('fetchChannelClassificationValue', 'No values returned for channel', {channelId});
            return {};
        }

        const groupId = values[0].group_id;
        if (!groupId) {
            logDebug('fetchChannelClassificationValue', 'Empty group_id in channel value', {channelId});
            return {};
        }

        updatePropertyValues(serverUrl, channelId, groupId, values);
        return {};
    } catch (error) {
        logError('fetchChannelClassificationValue', 'Failed to fetch channel classification value', {serverUrl, channelId}, error);
        return {error};
    }
}
