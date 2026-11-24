// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// The write path for channel attribute values. Reads live in
// @actions/remote/classification, which fetches the whole access_control group.

import {ACCESS_CONTROL_GROUP_NAME, CHANNEL_ATTRIBUTE_OBJECT_TYPE, FEATURE_FLAG_CHANNEL_ATTRIBUTES} from '@constants/channel_attributes';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getAccessControlGroupId} from '@queries/servers/properties';
import {getConfigValue} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

// Shared with the websocket value handlers so writes to one channel never interleave.
export function channelAttributeWriteLockKey(serverUrl: string, channelId: string): string {
    return `channel-attributes:${serverUrl}:${channelId}`;
}

export type ChannelAttributeValueInput = string | string[] | null;

/**
 * Sets or clears one channel attribute value. Not optimistic: the server can
 * refuse the write with a 403. A clear sends the type's empty value (see
 * getEmptyPropertyValue), never null, because the iOS bridge drops null keys.
 */
export async function setChannelAttributeValue(
    serverUrl: string,
    channelId: string,
    fieldId: string,
    value: string | string[],
): Promise<{data?: Array<PropertyValue<unknown>>; error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        if ((await getConfigValue(database, FEATURE_FLAG_CHANNEL_ATTRIBUTES)) !== 'true') {
            return {error: 'channel attributes are disabled'};
        }

        const groupId = await getAccessControlGroupId(database);
        if (!groupId) {
            logDebug('setChannelAttributeValue', 'skipped; access_control group id is not known yet', channelId, fieldId);
            return {error: 'access_control group id is unknown'};
        }

        const client = NetworkManager.getClient(serverUrl);
        const values = await EphemeralStore.runExclusive(channelAttributeWriteLockKey(serverUrl, channelId), async () => {
            const response = await client.patchPropertyValues(
                ACCESS_CONTROL_GROUP_NAME,
                CHANNEL_ATTRIBUTE_OBJECT_TYPE,
                channelId,
                [{field_id: fieldId, value}],
            );

            // No targetId: it would make this single-field response delete every
            // other value on the channel. targetId is only for the full-channel read.
            const models = await operator.handlePropertyValues({values: response, prepareRecordsOnly: true});
            await operator.batchRecords(models, 'setChannelAttributeValue', true);
            return response;
        });

        return {data: values};
    } catch (error) {
        logError('error on setChannelAttributeValue', channelId, fieldId, getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
