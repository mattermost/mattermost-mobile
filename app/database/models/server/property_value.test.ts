// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import PropertyFieldModel from './property_field';
import PropertyValueModel from './property_value';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

const SERVER_URL = `propertyValueModel.test.${Date.now()}.com`;

const applyFieldData = (field: PropertyFieldModel, mockData: PropertyField) => {
    field._raw.id = mockData.id;
    field.groupId = mockData.group_id;
    field.name = mockData.name;
    field.type = mockData.type;
    field.attrs = mockData.attrs ?? null;
    field.objectType = mockData.object_type;
    field.targetId = mockData.target_id;
    field.targetType = mockData.target_type;
    field.protected = mockData.protected;
    field.createAt = mockData.create_at;
    field.updateAt = mockData.update_at;
    field.deleteAt = mockData.delete_at;
    field.createdBy = mockData.created_by;
    field.updatedBy = mockData.updated_by;
};

const applyValueData = (pv: PropertyValueModel, mockData: PropertyValue) => {
    pv._raw.id = mockData.id;
    pv.fieldId = mockData.field_id;
    pv.targetId = mockData.target_id;
    pv.targetType = mockData.target_type;
    pv.groupId = mockData.group_id;
    pv.value = mockData.value;
    pv.createAt = mockData.create_at;
    pv.updateAt = mockData.update_at;
    pv.deleteAt = mockData.delete_at;
    pv.createdBy = mockData.created_by;
    pv.updatedBy = mockData.updated_by;
};

describe('PropertyValueModel', () => {
    let operator: ServerDataOperator;
    let propertyValue: PropertyValueModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        const mockField = TestHelper.createPropertyField('channel_1', 'channel', 0);
        const mockValue = TestHelper.createPropertyValue(mockField.id, 'post_1', 0);

        await database.write(async () => {
            await database.get<PropertyFieldModel>(PROPERTY_FIELD).create((f) => applyFieldData(f, mockField));
            propertyValue = await database.get<PropertyValueModel>(PROPERTY_VALUE).create((pv) => applyValueData(pv, mockValue));
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should have the correct table name', () => {
        expect(PropertyValueModel.table).toBe(PROPERTY_VALUE);
    });

    it('=> should declare belongs_to association on field_id', () => {
        expect(PropertyValueModel.associations).toBeDefined();
        expect(PropertyValueModel.associations[PROPERTY_FIELD]).toEqual({
            type: 'belongs_to',
            key: 'field_id',
        });
    });

    it('=> should match stored data', () => {
        expect(propertyValue.fieldId).toBe('channel_1-prop_field_0');
        expect(propertyValue.targetId).toBe('post_1');
        expect(propertyValue.targetType).toBe('post');
        expect(propertyValue.groupId).toBe('group_1');
        expect(propertyValue.value).toBe('Value 1');
        expect(propertyValue.deleteAt).toBe(0);
    });

    it('=> should resolve immutableRelation to PropertyField', async () => {
        const relation = propertyValue.field;
        expect(relation).toBeDefined();

        const relatedField = await relation.fetch();
        expect(relatedField).toBeDefined();
        expect(relatedField!.id).toBe('channel_1-prop_field_0');
        expect(relatedField!.name).toBe('Property 1');
    });
});
