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
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getPersistedPropertyFields, getPersistedPropertyGroupNames, getPersistedPropertyValues} from '@queries/servers/properties';
import {getConfigValue} from '@queries/servers/system';
import {logDebug, logError} from '@utils/log';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

async function clearClassificationData(database: Database, operator: ServerDataOperator) {
    const [existingFields, existingValues, existingGroupNames] = await Promise.all([
        getPersistedPropertyFields(database),
        getPersistedPropertyValues(database),
        getPersistedPropertyGroupNames(database),
    ]);

    const groupId = existingGroupNames[CLASSIFICATIONS_GROUP_NAME];
    if (!groupId) {
        return;
    }

    const {[groupId]: _, ...remainingFields} = existingFields;
    const {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: __, ...remainingValues} = existingValues;
    const {[CLASSIFICATIONS_GROUP_NAME]: ___, ...remainingGroupNames} = existingGroupNames;

    await operator.handleSystem({
        systems: [
            {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: remainingFields},
            {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: remainingValues},
            {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: remainingGroupNames},
        ],
        prepareRecordsOnly: false,
    });
}

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');
        if (featureFlag !== 'true') {
            await clearClassificationData(database, operator);
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
            await clearClassificationData(database, operator);
            return {};
        }

        const groupId = allFields[0].group_id;
        if (!groupId || allFields.some((f) => f.group_id !== groupId)) {
            logError('fetchClassificationBanner', 'Unexpected classification fields', {allFields});
            return {};
        }

        const values = await client.getSystemPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME);

        const [existingFields, existingValues, existingGroupNames] = await Promise.all([
            getPersistedPropertyFields(database),
            getPersistedPropertyValues(database),
            getPersistedPropertyGroupNames(database),
        ]);

        const existingGroupFields = existingFields[groupId] ?? [];
        const fieldMap = new Map(existingGroupFields.map((f) => [f.id, f]));
        for (const field of allFields) {
            if (field.delete_at > 0) {
                fieldMap.delete(field.id);
            } else {
                fieldMap.set(field.id, field);
            }
        }
        const mergedFields = {...existingFields, [groupId]: [...fieldMap.values()]};
        const mergedGroupNames = {...existingGroupNames, [CLASSIFICATIONS_GROUP_NAME]: groupId};
        const mergedValues = values.length > 0 ? {...existingValues, [CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: values} : existingValues;

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: mergedFields},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: mergedValues},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: mergedGroupNames},
            ],
            prepareRecordsOnly: false,
        });

        return {};
    } catch (error) {
        logError('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        return {error};
    }
}

export async function fetchChannelClassificationValue(serverUrl: string, channelId: string): Promise<{error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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

        const existingValues = await getPersistedPropertyValues(database);
        const mergedValues = {...existingValues, [channelId]: values};

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: mergedValues},
            ],
            prepareRecordsOnly: false,
        });

        return {};
    } catch (error) {
        logError('fetchChannelClassificationValue', 'Failed to fetch channel classification value', {serverUrl, channelId}, error);
        return {error};
    }
}
