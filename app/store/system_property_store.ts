// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useReducer} from 'react';

export type PropertyStoreListener = (serverUrl: string, groupId: string) => void;

// fieldStore[serverUrl][groupId][fieldId]
type FieldStore = Record<string, Record<string, Record<string, PropertyField>>>;

// Unified value store: valueStore[serverUrl][targetId][fieldId]
// System-scoped values carry their own target_id (e.g. 'system'), channel
// values carry the channelId, etc.  Callers decide which target_id to query.
type ValueStore = Record<string, Record<string, Record<string, PropertyValue<string>>>>;

type GroupNameIndex = Record<string, Record<string, string>>;

const fieldStore: FieldStore = Object.create(null) as FieldStore;
const valueStore: ValueStore = Object.create(null) as ValueStore;
const listeners = new Set<PropertyStoreListener>();
const groupNameToId: GroupNameIndex = Object.create(null) as GroupNameIndex;

function getFieldMap(serverUrl: string, groupId: string): Record<string, PropertyField> {
    if (!fieldStore[serverUrl]) {
        fieldStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyField>>;
    }
    if (!fieldStore[serverUrl][groupId]) {
        fieldStore[serverUrl][groupId] = Object.create(null) as Record<string, PropertyField>;
    }
    return fieldStore[serverUrl][groupId];
}

function getValueMap(serverUrl: string, targetId: string): Record<string, PropertyValue<string>> {
    if (!valueStore[serverUrl]) {
        valueStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyValue<string>>>;
    }
    if (!valueStore[serverUrl][targetId]) {
        valueStore[serverUrl][targetId] = Object.create(null) as Record<string, PropertyValue<string>>;
    }
    return valueStore[serverUrl][targetId];
}

function notify(serverUrl: string, groupId: string) {
    for (const listener of listeners) {
        listener(serverUrl, groupId);
    }
}

export function registerGroupName(serverUrl: string, groupName: string, groupId: string): void {
    if (!groupNameToId[serverUrl]) {
        groupNameToId[serverUrl] = Object.create(null) as Record<string, string>;
    }
    groupNameToId[serverUrl][groupName] = groupId;
}

export function getGroupIdByName(serverUrl: string, groupName: string): string | undefined {
    return groupNameToId[serverUrl]?.[groupName];
}

// --- Field operations ---

export function setPropertyFields(serverUrl: string, groupId: string, fields: PropertyField[]): void {
    if (!fieldStore[serverUrl]) {
        fieldStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyField>>;
    }
    const map: Record<string, PropertyField> = Object.create(null) as Record<string, PropertyField>;
    for (const f of fields) {
        map[f.id] = f;
    }
    fieldStore[serverUrl][groupId] = map;
    notify(serverUrl, groupId);
}

export function updatePropertyField(serverUrl: string, field: PropertyField): void {
    const map = getFieldMap(serverUrl, field.group_id);
    map[field.id] = field;
    notify(serverUrl, field.group_id);
}

export function removePropertyField(serverUrl: string, groupId: string, fieldId: string): void {
    const map = getFieldMap(serverUrl, groupId);
    if (fieldId in map) {
        delete map[fieldId];
        notify(serverUrl, groupId);
    }
}

export function removePropertyFieldById(serverUrl: string, fieldId: string): void {
    const groups = fieldStore[serverUrl];
    if (!groups) {
        return;
    }
    for (const groupId of Object.keys(groups)) {
        if (fieldId in groups[groupId]) {
            delete groups[groupId][fieldId];
            notify(serverUrl, groupId);
            return;
        }
    }
}

export function getPropertyFields(serverUrl: string, groupId: string): PropertyField[] {
    const map = fieldStore[serverUrl]?.[groupId];
    if (!map) {
        return [];
    }
    return Object.values(map);
}

// --- Value operations (unified, target-keyed) ---

export function setPropertyValues(serverUrl: string, targetId: string, groupId: string, values: Array<PropertyValue<string>>): void {
    if (!valueStore[serverUrl]) {
        valueStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyValue<string>>>;
    }
    const map: Record<string, PropertyValue<string>> = Object.create(null) as Record<string, PropertyValue<string>>;
    for (const v of values) {
        map[v.field_id] = v;
    }
    valueStore[serverUrl][targetId] = map;
    notify(serverUrl, groupId);
}

export function updatePropertyValues(serverUrl: string, targetId: string, groupId: string, values: Array<PropertyValue<string>>): void {
    const map = getValueMap(serverUrl, targetId);
    for (const v of values) {
        map[v.field_id] = v;
    }
    notify(serverUrl, groupId);
}

export function getPropertyValuesForTarget(serverUrl: string, targetId: string): Array<PropertyValue<string>> {
    const map = valueStore[serverUrl]?.[targetId];
    if (!map) {
        return [];
    }
    return Object.values(map);
}

export function getPropertyValueForField(serverUrl: string, targetId: string, fieldId: string): PropertyValue<string> | undefined {
    return valueStore[serverUrl]?.[targetId]?.[fieldId];
}

// --- Subscription ---

export function subscribe(listener: PropertyStoreListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function usePropertyStoreGroup(serverUrl: string, groupId: string) {
    const [, forceRender] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
        const unsub = subscribe((url, group) => {
            if (url === serverUrl && group === groupId) {
                forceRender();
            }
        });
        return unsub;
    }, [serverUrl, groupId]);

    return {
        fields: getPropertyFields(serverUrl, groupId),
    };
}
