// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updatePropertyField, removePropertyFieldById, updateSystemPropertyValues} from '@store/system_property_store';
import {safeParseJSON} from '@utils/helpers';
import {logDebug} from '@utils/log';

export function handlePropertyFieldCreatedOrUpdated(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {property_field?: string; object_type?: string};
    if (!data.property_field) {
        return;
    }

    const field = safeParseJSON(data.property_field) as PropertyField | string;
    if (typeof field === 'string') {
        logDebug('handlePropertyFieldCreatedOrUpdated', 'Failed to parse property_field from WS event');
        return;
    }

    updatePropertyField(serverUrl, field);
}

export function handlePropertyFieldDeleted(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as {field_id?: string; object_type?: string};
    if (!data.field_id) {
        return;
    }

    removePropertyFieldById(serverUrl, data.field_id);
}

export function handlePropertyValuesUpdated(serverUrl: string, msg: WebSocketMessage) {
    const data = msg.data as PropertyValuesUpdatedData;
    if (!data.values) {
        return;
    }

    const values = safeParseJSON(data.values) as Array<PropertyValue<string>> | string;
    if (typeof values === 'string') {
        logDebug('handlePropertyValuesUpdated', 'Failed to parse values from WS event');
        return;
    }

    if (values.length === 0) {
        return;
    }

    const byGroup: Record<string, Array<PropertyValue<string>>> = {};
    for (const v of values) {
        if (!byGroup[v.group_id]) {
            byGroup[v.group_id] = [];
        }
        byGroup[v.group_id].push(v);
    }

    for (const [groupId, groupValues] of Object.entries(byGroup)) {
        updateSystemPropertyValues(serverUrl, groupId, groupValues);
    }
}
