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

// --- Internal helpers ---

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

function mutate(serverUrl: string, groupId: string, fn: () => void): void {
    fn();
    notify(serverUrl, groupId);
}

// --- Snapshot getters (used by persistPropertyStoreSnapshot) ---

export function getFieldStoreSnapshot(serverUrl: string): Record<string, PropertyField[]> {
    const groups = fieldStore[serverUrl];
    if (!groups) {
        return {};
    }
    const result: Record<string, PropertyField[]> = {};
    for (const [groupId, fields] of Object.entries(groups)) {
        result[groupId] = Object.values(fields);
    }
    return result;
}

export function getValueStoreSnapshot(serverUrl: string): Record<string, Array<PropertyValue<string>>> {
    const targets = valueStore[serverUrl];
    if (!targets) {
        return {};
    }
    const result: Record<string, Array<PropertyValue<string>>> = {};
    for (const [targetId, values] of Object.entries(targets)) {
        result[targetId] = Object.values(values);
    }
    return result;
}

export function getGroupNameSnapshot(serverUrl: string): Record<string, string> {
    return {...(groupNameToId[serverUrl] ?? {})};
}

// --- Group name registry ---

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
    mutate(serverUrl, groupId, () => {
        if (!fieldStore[serverUrl]) {
            fieldStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyField>>;
        }
        const map: Record<string, PropertyField> = Object.create(null) as Record<string, PropertyField>;
        for (const f of fields) {
            map[f.id] = f;
        }
        fieldStore[serverUrl][groupId] = map;
    });
}

export function updatePropertyField(serverUrl: string, field: PropertyField): void {
    mutate(serverUrl, field.group_id, () => {
        const map = getFieldMap(serverUrl, field.group_id);
        map[field.id] = field;
    });
}

export function removePropertyField(serverUrl: string, groupId: string, fieldId: string): void {
    const map = getFieldMap(serverUrl, groupId);
    if (fieldId in map) {
        mutate(serverUrl, groupId, () => {
            delete map[fieldId];
        });
    }
}

export function removePropertyFieldById(serverUrl: string, fieldId: string): void {
    const groups = fieldStore[serverUrl];
    if (!groups) {
        return;
    }
    for (const groupId of Object.keys(groups)) {
        if (fieldId in groups[groupId]) {
            mutate(serverUrl, groupId, () => {
                delete groups[groupId][fieldId];
            });
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
    mutate(serverUrl, groupId, () => {
        if (!valueStore[serverUrl]) {
            valueStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyValue<string>>>;
        }
        const map: Record<string, PropertyValue<string>> = Object.create(null) as Record<string, PropertyValue<string>>;
        for (const v of values) {
            map[v.field_id] = v;
        }
        valueStore[serverUrl][targetId] = map;
    });
}

export function updatePropertyValues(serverUrl: string, targetId: string, groupId: string, values: Array<PropertyValue<string>>): void {
    mutate(serverUrl, groupId, () => {
        const map = getValueMap(serverUrl, targetId);
        for (const v of values) {
            map[v.field_id] = v;
        }
    });
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

/**
 * Atomically replaces all property data for a server.
 * Used by hydratePropertyStore and future batch-fetch actions.
 * Notifies once per affected group — callers do not need to notify separately.
 */
export function setAllPropertyData(serverUrl: string, data: {
    fieldsByGroup: Record<string, PropertyField[]>;
    valuesByTarget: Record<string, Array<PropertyValue<string>>>;
    groupNames: Record<string, string>;
}): void {
    // Replace field store for this server
    fieldStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyField>>;
    for (const [groupId, fields] of Object.entries(data.fieldsByGroup)) {
        const map: Record<string, PropertyField> = Object.create(null) as Record<string, PropertyField>;
        for (const f of fields) {
            map[f.id] = f;
        }
        fieldStore[serverUrl][groupId] = map;
    }

    // Replace value store for this server
    valueStore[serverUrl] = Object.create(null) as Record<string, Record<string, PropertyValue<string>>>;
    for (const [targetId, values] of Object.entries(data.valuesByTarget)) {
        const map: Record<string, PropertyValue<string>> = Object.create(null) as Record<string, PropertyValue<string>>;
        for (const v of values) {
            map[v.field_id] = v;
        }
        valueStore[serverUrl][targetId] = map;
    }

    // Replace group names for this server
    groupNameToId[serverUrl] = Object.create(null) as Record<string, string>;
    for (const [groupName, groupId] of Object.entries(data.groupNames)) {
        groupNameToId[serverUrl][groupName] = groupId;
    }

    // Notify once per group that has field data
    for (const groupId of Object.keys(data.fieldsByGroup)) {
        notify(serverUrl, groupId);
    }
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
