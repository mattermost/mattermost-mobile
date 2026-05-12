// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as store from '@store/system_property_store';

import {handlePropertyFieldCreatedOrUpdated, handlePropertyFieldDeleted, handlePropertyValuesUpdated} from './properties';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
}));

const serverUrl = 'ws-properties.test.com';
const groupId = 'test_group';

const makeField = (id: string, overrides?: Partial<PropertyField>): PropertyField => ({
    id,
    group_id: groupId,
    name: `field_${id}`,
    type: 'select',
    object_type: 'template',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {},
    ...overrides,
});

const makeValue = (fieldId: string, value: string): PropertyValue<string> => ({
    id: `val-${fieldId}`,
    target_id: 'system',
    target_type: 'system',
    group_id: groupId,
    field_id: fieldId,
    value,
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
});

const systemTargetId = 'system';

beforeEach(() => {
    store.setPropertyFields(serverUrl, groupId, []);
    store.setPropertyValues(serverUrl, systemTargetId, groupId, []);
});

describe('handlePropertyFieldCreatedOrUpdated', () => {
    it('should add a field to the store', () => {
        const field = makeField('f1');
        const msg = {
            event: 'property_field_created',
            data: {property_field: JSON.stringify(field), object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const fields = store.getPropertyFields(serverUrl, groupId);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('f1');
    });

    it('should update an existing field in the store', () => {
        store.setPropertyFields(serverUrl, groupId, [makeField('f1')]);

        const updated = makeField('f1', {name: 'updated'});
        const msg = {
            event: 'property_field_updated',
            data: {property_field: JSON.stringify(updated), object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldCreatedOrUpdated(serverUrl, msg);

        const fields = store.getPropertyFields(serverUrl, groupId);
        expect(fields).toHaveLength(1);
        expect(fields[0].name).toBe('updated');
    });

    it('should ignore events with no property_field data', () => {
        const msg = {
            event: 'property_field_created',
            data: {},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldCreatedOrUpdated(serverUrl, msg);
        expect(store.getPropertyFields(serverUrl, groupId)).toHaveLength(0);
    });

    it('should ignore events with invalid JSON', () => {
        const msg = {
            event: 'property_field_created',
            data: {property_field: 'not-json'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldCreatedOrUpdated(serverUrl, msg);
        expect(store.getPropertyFields(serverUrl, groupId)).toHaveLength(0);
    });
});

describe('handlePropertyFieldDeleted', () => {
    it('should remove a field from the store by id', () => {
        store.setPropertyFields(serverUrl, groupId, [makeField('f1'), makeField('f2')]);

        const msg = {
            event: 'property_field_deleted',
            data: {field_id: 'f1', object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldDeleted(serverUrl, msg);

        const fields = store.getPropertyFields(serverUrl, groupId);
        expect(fields).toHaveLength(1);
        expect(fields[0].id).toBe('f2');
    });

    it('should do nothing when field_id is missing', () => {
        store.setPropertyFields(serverUrl, groupId, [makeField('f1')]);

        const msg = {
            event: 'property_field_deleted',
            data: {object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldDeleted(serverUrl, msg);
        expect(store.getPropertyFields(serverUrl, groupId)).toHaveLength(1);
    });

    it('should do nothing when field_id does not match any stored field', () => {
        store.setPropertyFields(serverUrl, groupId, [makeField('f1')]);

        const listener = jest.fn();
        const unsub = store.subscribe(listener);
        listener.mockClear();

        const msg = {
            event: 'property_field_deleted',
            data: {field_id: 'non-existent', object_type: 'template'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyFieldDeleted(serverUrl, msg);
        expect(store.getPropertyFields(serverUrl, groupId)).toHaveLength(1);
        expect(listener).not.toHaveBeenCalled();

        unsub();
    });
});

describe('handlePropertyValuesUpdated', () => {
    it('should add new values to the store grouped by group_id', () => {
        const values = [makeValue('f1', 'v1'), makeValue('f2', 'v2')];
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify(values)},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);

        const stored = store.getPropertyValuesForTarget(serverUrl, systemTargetId);
        expect(stored).toHaveLength(2);
    });

    it('should update existing values in the store', () => {
        store.setPropertyValues(serverUrl, systemTargetId, groupId, [makeValue('f1', 'old')]);

        const updated = [makeValue('f1', 'new')];
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify(updated)},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);

        const stored = store.getPropertyValuesForTarget(serverUrl, systemTargetId);
        expect(stored).toHaveLength(1);
        expect(stored[0].value).toBe('new');
    });

    it('should handle values from multiple groups', () => {
        const otherGroupId = 'other_group';
        const v1 = makeValue('f1', 'v1');
        const v2 = {...makeValue('f2', 'v2'), group_id: otherGroupId};

        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify([v1, v2])},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);

        expect(store.getPropertyValuesForTarget(serverUrl, systemTargetId)).toHaveLength(2);
    });

    it('should ignore events with no values', () => {
        const listener = jest.fn();
        const unsub = store.subscribe(listener);
        listener.mockClear();

        const msg = {
            event: 'property_values_updated',
            data: {},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);
        expect(listener).not.toHaveBeenCalled();

        unsub();
    });

    it('should ignore events with invalid JSON', () => {
        const listener = jest.fn();
        const unsub = store.subscribe(listener);
        listener.mockClear();

        const msg = {
            event: 'property_values_updated',
            data: {values: 'not-json'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);
        expect(listener).not.toHaveBeenCalled();

        unsub();
    });

    it('should ignore events with empty values array', () => {
        const listener = jest.fn();
        const unsub = store.subscribe(listener);
        listener.mockClear();

        const msg = {
            event: 'property_values_updated',
            data: {values: '[]'},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);
        expect(listener).not.toHaveBeenCalled();

        unsub();
    });

    it('should store channel property values by their target_id', () => {
        const channelId = 'channel-abc';
        const channelValue: PropertyValue<string> = {
            id: 'val-chan',
            target_id: channelId,
            target_type: 'channel',
            group_id: groupId,
            field_id: 'chan-field',
            value: 'level-1',
            create_at: 1000,
            update_at: 1000,
            delete_at: 0,
        };
        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify([channelValue])},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);

        expect(store.getPropertyValuesForTarget(serverUrl, channelId)).toHaveLength(1);
        expect(store.getPropertyValuesForTarget(serverUrl, channelId)[0].value).toBe('level-1');
    });

    it('should isolate values across different target ids', () => {
        const channelId = 'channel-xyz';
        const systemVal = makeValue('sys-field', 'sys-val');
        const channelVal: PropertyValue<string> = {
            id: 'val-chan',
            target_id: channelId,
            target_type: 'channel',
            group_id: groupId,
            field_id: 'chan-field',
            value: 'chan-val',
            create_at: 1000,
            update_at: 1000,
            delete_at: 0,
        };

        const msg = {
            event: 'property_values_updated',
            data: {values: JSON.stringify([systemVal, channelVal])},
            broadcast: {},
            seq: 1,
        } as WebSocketMessage;

        handlePropertyValuesUpdated(serverUrl, msg);

        expect(store.getPropertyValuesForTarget(serverUrl, systemTargetId)).toHaveLength(1);
        expect(store.getPropertyValuesForTarget(serverUrl, channelId)).toHaveLength(1);
    });
});
