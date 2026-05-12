// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getGroupIdByName,
    getPropertyFields,
    getPropertyValueForField,
    getPropertyValuesForTarget,
    registerGroupName,
    removePropertyField,
    removePropertyFieldById,
    setPropertyFields,
    setPropertyValues,
    subscribe,
    updatePropertyField,
    updatePropertyValues,
} from './system_property_store';

const serverUrl = 'property-store.test.com';
const groupId = 'test_group';
const targetId = 'system';

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

const makeValue = (fieldId: string, value: string, overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id: `val-${fieldId}`,
    target_id: targetId,
    target_type: 'system',
    group_id: groupId,
    field_id: fieldId,
    value,
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

describe('system_property_store', () => {
    beforeEach(() => {
        setPropertyFields(serverUrl, groupId, []);
        setPropertyValues(serverUrl, targetId, groupId, []);
    });

    describe('field operations', () => {
        it('should store and retrieve fields via setPropertyFields', () => {
            const fields = [makeField('f1'), makeField('f2')];
            setPropertyFields(serverUrl, groupId, fields);

            const result = getPropertyFields(serverUrl, groupId);
            expect(result).toHaveLength(2);
            expect(result.find((f) => f.id === 'f1')).toBeDefined();
            expect(result.find((f) => f.id === 'f2')).toBeDefined();
        });

        it('should overwrite existing fields on setPropertyFields', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            setPropertyFields(serverUrl, groupId, [makeField('f2')]);

            const result = getPropertyFields(serverUrl, groupId);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('f2');
        });

        it('should update a single field via updatePropertyField', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            const updated = makeField('f1', {name: 'updated_name'});
            updatePropertyField(serverUrl, updated);

            const result = getPropertyFields(serverUrl, groupId);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('updated_name');
        });

        it('should add a new field via updatePropertyField if not present', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            updatePropertyField(serverUrl, makeField('f2'));

            const result = getPropertyFields(serverUrl, groupId);
            expect(result).toHaveLength(2);
        });

        it('should remove a field via removePropertyField', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1'), makeField('f2')]);
            removePropertyField(serverUrl, groupId, 'f1');

            const result = getPropertyFields(serverUrl, groupId);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('f2');
        });

        it('should not notify when removing a non-existent field', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            removePropertyField(serverUrl, groupId, 'non-existent');
            expect(listener).not.toHaveBeenCalled();

            unsub();
        });

        it('should remove field by id across groups via removePropertyFieldById', () => {
            const otherGroup = 'other_group';
            const field = makeField('f1', {group_id: otherGroup});
            setPropertyFields(serverUrl, otherGroup, [field]);

            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            removePropertyFieldById(serverUrl, 'f1');

            expect(getPropertyFields(serverUrl, otherGroup)).toHaveLength(0);
            expect(listener).toHaveBeenCalledWith(serverUrl, otherGroup);

            unsub();
        });

        it('should not notify if removePropertyFieldById finds nothing', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            removePropertyFieldById(serverUrl, 'non-existent');
            expect(listener).not.toHaveBeenCalled();

            unsub();
        });

        it('should return empty array for unknown server/group', () => {
            expect(getPropertyFields('unknown-server', 'unknown-group')).toEqual([]);
        });
    });

    describe('value operations', () => {
        it('should store and retrieve values via setPropertyValues', () => {
            const values = [makeValue('f1', 'v1'), makeValue('f2', 'v2')];
            setPropertyValues(serverUrl, targetId, groupId, values);

            const result = getPropertyValuesForTarget(serverUrl, targetId);
            expect(result).toHaveLength(2);
        });

        it('should overwrite existing values on setPropertyValues', () => {
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'old')]);
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f2', 'new')]);

            const result = getPropertyValuesForTarget(serverUrl, targetId);
            expect(result).toHaveLength(1);
            expect(result[0].field_id).toBe('f2');
        });

        it('should merge values via updatePropertyValues', () => {
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'v1')]);
            updatePropertyValues(serverUrl, targetId, groupId, [makeValue('f2', 'v2')]);

            const result = getPropertyValuesForTarget(serverUrl, targetId);
            expect(result).toHaveLength(2);
        });

        it('should update existing value via updatePropertyValues', () => {
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'old')]);
            updatePropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'new')]);

            const result = getPropertyValuesForTarget(serverUrl, targetId);
            expect(result).toHaveLength(1);
            expect(result[0].value).toBe('new');
        });

        it('should return empty array for unknown target', () => {
            expect(getPropertyValuesForTarget('unknown-server', 'unknown-target')).toEqual([]);
        });

        it('should isolate values across different target ids', () => {
            const channelId = 'channel-abc';
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'sys-val')]);
            updatePropertyValues(serverUrl, channelId, groupId, [makeValue('f1', 'chan-val', {target_id: channelId})]);

            expect(getPropertyValuesForTarget(serverUrl, targetId)).toHaveLength(1);
            expect(getPropertyValuesForTarget(serverUrl, targetId)[0].value).toBe('sys-val');
            expect(getPropertyValuesForTarget(serverUrl, channelId)).toHaveLength(1);
            expect(getPropertyValuesForTarget(serverUrl, channelId)[0].value).toBe('chan-val');
        });

        it('should look up a single value by field id', () => {
            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'v1'), makeValue('f2', 'v2')]);

            expect(getPropertyValueForField(serverUrl, targetId, 'f1')?.value).toBe('v1');
            expect(getPropertyValueForField(serverUrl, targetId, 'f2')?.value).toBe('v2');
            expect(getPropertyValueForField(serverUrl, targetId, 'f3')).toBeUndefined();
        });
    });

    describe('subscriber mechanism', () => {
        it('should notify subscriber on setPropertyFields', () => {
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            expect(listener).toHaveBeenCalledWith(serverUrl, groupId);

            unsub();
        });

        it('should notify subscriber on updatePropertyField', () => {
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            updatePropertyField(serverUrl, makeField('f1'));
            expect(listener).toHaveBeenCalledWith(serverUrl, groupId);

            unsub();
        });

        it('should notify subscriber on removePropertyField', () => {
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            removePropertyField(serverUrl, groupId, 'f1');
            expect(listener).toHaveBeenCalledWith(serverUrl, groupId);

            unsub();
        });

        it('should notify subscriber on setPropertyValues', () => {
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            setPropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'v1')]);
            expect(listener).toHaveBeenCalledWith(serverUrl, groupId);

            unsub();
        });

        it('should notify subscriber on updatePropertyValues', () => {
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            updatePropertyValues(serverUrl, targetId, groupId, [makeValue('f1', 'v1')]);
            expect(listener).toHaveBeenCalledWith(serverUrl, groupId);

            unsub();
        });

        it('should stop notifying after unsubscribe', () => {
            const listener = jest.fn();
            const unsub = subscribe(listener);
            listener.mockClear();

            unsub();
            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            expect(listener).not.toHaveBeenCalled();
        });

        it('should support multiple subscribers', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            const unsub1 = subscribe(listener1);
            const unsub2 = subscribe(listener2);
            listener1.mockClear();
            listener2.mockClear();

            setPropertyFields(serverUrl, groupId, [makeField('f1')]);
            expect(listener1).toHaveBeenCalledWith(serverUrl, groupId);
            expect(listener2).toHaveBeenCalledWith(serverUrl, groupId);

            unsub1();
            unsub2();
        });
    });

    describe('group name registry', () => {
        it('should register and retrieve group name to id mapping', () => {
            registerGroupName(serverUrl, 'my_group', 'uuid-123');
            expect(getGroupIdByName(serverUrl, 'my_group')).toBe('uuid-123');
        });

        it('should return undefined for unregistered group name', () => {
            expect(getGroupIdByName(serverUrl, 'unknown_group')).toBeUndefined();
        });

        it('should return undefined for unregistered server', () => {
            expect(getGroupIdByName('unknown-server', 'my_group')).toBeUndefined();
        });

        it('should overwrite existing mapping when re-registered', () => {
            registerGroupName(serverUrl, 'my_group', 'uuid-old');
            registerGroupName(serverUrl, 'my_group', 'uuid-new');
            expect(getGroupIdByName(serverUrl, 'my_group')).toBe('uuid-new');
        });

        it('should support multiple group names per server', () => {
            registerGroupName(serverUrl, 'group_a', 'id-a');
            registerGroupName(serverUrl, 'group_b', 'id-b');
            expect(getGroupIdByName(serverUrl, 'group_a')).toBe('id-a');
            expect(getGroupIdByName(serverUrl, 'group_b')).toBe('id-b');
        });
    });
});
