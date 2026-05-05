// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useReducer} from 'react';

export type PropertyStoreListener = (serverUrl: string, groupId: string) => void;

type FieldStore = Record<string, Record<string, Record<string, PropertyField>>>;
type ValueStore = Record<string, Record<string, Record<string, PropertyValue<string>>>>;

const fieldStore: FieldStore = {};
const valueStore: ValueStore = {};
const listeners = new Set<PropertyStoreListener>();

function getFieldMap(serverUrl: string, groupId: string): Record<string, PropertyField> {
    if (!fieldStore[serverUrl]) {
        fieldStore[serverUrl] = {};
    }
    if (!fieldStore[serverUrl][groupId]) {
        fieldStore[serverUrl][groupId] = {};
    }
    return fieldStore[serverUrl][groupId];
}

function getValueMap(serverUrl: string, groupId: string): Record<string, PropertyValue<string>> {
    if (!valueStore[serverUrl]) {
        valueStore[serverUrl] = {};
    }
    if (!valueStore[serverUrl][groupId]) {
        valueStore[serverUrl][groupId] = {};
    }
    return valueStore[serverUrl][groupId];
}

function notify(serverUrl: string, groupId: string) {
    for (const listener of listeners) {
        listener(serverUrl, groupId);
    }
}

export function setPropertyFields(serverUrl: string, groupId: string, fields: PropertyField[]): void {
    if (!fieldStore[serverUrl]) {
        fieldStore[serverUrl] = {};
    }
    const map: Record<string, PropertyField> = {};
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

export function setSystemPropertyValues(serverUrl: string, groupId: string, values: Array<PropertyValue<string>>): void {
    if (!valueStore[serverUrl]) {
        valueStore[serverUrl] = {};
    }
    const map: Record<string, PropertyValue<string>> = {};
    for (const v of values) {
        map[v.field_id] = v;
    }
    valueStore[serverUrl][groupId] = map;
    notify(serverUrl, groupId);
}

export function updateSystemPropertyValues(serverUrl: string, groupId: string, values: Array<PropertyValue<string>>): void {
    const map = getValueMap(serverUrl, groupId);
    for (const v of values) {
        map[v.field_id] = v;
    }
    notify(serverUrl, groupId);
}

export function getSystemPropertyValues(serverUrl: string, groupId: string): Array<PropertyValue<string>> {
    const map = valueStore[serverUrl]?.[groupId];
    if (!map) {
        return [];
    }
    return Object.values(map);
}

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
        values: getSystemPropertyValues(serverUrl, groupId),
    };
}
