// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    CLASSIFICATIONS_CHANNEL_OBJECT_TYPE,
    CLASSIFICATIONS_FIELD_TARGET_ID,
    CLASSIFICATIONS_FIELD_TARGET_TYPE,
    CLASSIFICATIONS_FIELD_NAME,
    CLASSIFICATIONS_GROUP_NAME,
    CLASSIFICATIONS_SYSTEM_OBJECT_TYPE,
    CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
} from '@constants/classification';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getPropertyFieldsByNames} from '@queries/servers/properties';
import {getConfigValue} from '@queries/servers/system';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export async function fetchClassificationBanner(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const featureFlag = await getConfigValue(database, 'FeatureFlagClassificationMarkings');

        if (featureFlag === 'true') {
            const client = NetworkManager.getClient(serverUrl);

            const [systemFields, channelFields] = await Promise.all([
                client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
                client.getPropertyFields(CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_CHANNEL_OBJECT_TYPE, CLASSIFICATIONS_FIELD_TARGET_TYPE, CLASSIFICATIONS_FIELD_TARGET_ID),
            ]);

            const allFields = [...systemFields, ...channelFields];

            if (allFields.length > 0) {
                const groupId = allFields[0].group_id;
                if (!groupId || allFields.some((f) => f.group_id !== groupId)) {
                    logError('fetchClassificationBanner', 'Unexpected classification fields');
                    return {};
                }

                const values = await client.getSystemPropertyValues<string>(CLASSIFICATIONS_GROUP_NAME);

                const fieldModels = await operator.handlePropertyFields({groupId, fields: allFields, prepareRecordsOnly: true});
                const valueModels = await operator.handlePropertyValues({targetId: CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, values, prepareRecordsOnly: true});
                await operator.batchRecords([...fieldModels, ...valueModels], 'fetchClassificationBanner');

                return {};
            }

            logDebug('fetchClassificationBanner', 'No classification fields returned');
        }

        // Feature disabled or no active fields returned: remove any locally stored classification data.
        // We look up the stored fields by name and re-submit them stamped with a non-zero delete_at.
        // handlePropertyFields treats a non-zero delete_at as a deletion, so the operator removes those
        // fields and cascades the removal to each field's property values in a single batch.
        const stale = await getPropertyFieldsByNames(database, [CLASSIFICATIONS_FIELD_NAME]);
        if (stale.length) {
            await operator.handlePropertyFields({
                fields: stale.map((f) => ({id: f.id, delete_at: Date.now()} as PropertyField)),
                prepareRecordsOnly: false,
            });
        }

        return {};
    } catch (error) {
        logError('fetchClassificationBanner', 'Failed to fetch classification banner data', error);
        forceLogoutIfNecessary(serverUrl, error);
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

        await operator.handlePropertyValues({targetId: channelId, values, prepareRecordsOnly: false});

        return {};
    } catch (error) {
        logError('fetchChannelClassificationValue', 'Failed to fetch channel classification value', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
