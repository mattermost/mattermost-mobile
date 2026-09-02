// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// The write path for channel attribute values. Reads live in
// @actions/remote/classification, which fetches the whole access_control group.

import {ACCESS_CONTROL_GROUP_NAME, CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getAccessControlGroupId} from '@queries/servers/properties';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export type ChannelAttributeValueInput = string | string[] | null;

/**
 * Normalises a value the way the server does before it decides whether the write
 * is a clear: an empty string and an empty list are both "unset", and unset is
 * sent as null.
 */
function normalizeValue(value: ChannelAttributeValueInput): string | string[] | null {
    if (value === null || value === '') {
        return null;
    }
    if (Array.isArray(value)) {
        return value.length ? value : null;
    }
    return value;
}

/**
 * Sets or clears one channel attribute value.
 *
 * Not optimistic. A 403 is an ordinary outcome here — the field's change policy
 * or its permission tier can refuse the write — and a chip that flips back is
 * worse than one that takes a moment to settle.
 *
 * Clearing needs no special case: the server answers a clear with an upserted
 * null-valued row rather than a delete event, and a null value already reads as
 * unset everywhere downstream, so the row is persisted like any other. The webapp
 * has to synthesise a delete only because its reducer keys on presence.
 */
export async function setChannelAttributeValue(
    serverUrl: string,
    channelId: string,
    fieldId: string,
    value: ChannelAttributeValueInput,
): Promise<{data?: Array<PropertyValue<unknown>>; error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Every value is addressed by group, and nothing maps the group name to an
        // id locally until the fields have been fetched. Writing without it would
        // address the wrong group, so this fails rather than guessing.
        const groupId = await getAccessControlGroupId(database);
        if (!groupId) {
            logDebug('setChannelAttributeValue', 'skipped; access_control group id is not known yet', channelId, fieldId);
            return {error: 'access_control group id is unknown'};
        }

        const client = NetworkManager.getClient(serverUrl);
        const values = await client.patchPropertyValues(
            ACCESS_CONTROL_GROUP_NAME,
            CHANNEL_ATTRIBUTE_OBJECT_TYPE,
            channelId,
            [{field_id: fieldId, value: normalizeValue(value)}],
        );

        // Deliberately no targetId: it makes the write authoritative for the whole
        // channel, so a single-field response would delete every other attribute's
        // value on this channel. targetId belongs only to the full-channel read.
        await operator.handlePropertyValues({values, prepareRecordsOnly: false});

        return {data: values};
    } catch (error) {
        // The channel and field ids are safe to log; the value is a marking and is
        // not.
        logError('error on setChannelAttributeValue', channelId, fieldId, getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
