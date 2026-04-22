// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import PropertyFieldModel from './property_field';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

const SERVER_URL = `propertyFieldModel.test.${Date.now()}.com`;

const applyMockData = (field: PropertyFieldModel, mockData: PropertyField) => {
    field._raw.id = mockData.id;
    field.groupId = mockData.group_id;
    field.name = mockData.name;
    field.type = mockData.type;
    field.attrs = mockData.attrs ?? null;
    field.objectType = mockData.object_type;
    field.targetId = mockData.target_id;
    field.targetType = mockData.target_type;
    field.protected = mockData.protected;
    field.permissionField = mockData.permission_field ?? null;
    field.permissionValues = mockData.permission_values ?? null;
    field.permissionOptions = mockData.permission_options ?? null;
    field.createAt = mockData.create_at;
    field.updateAt = mockData.update_at;
    field.deleteAt = mockData.delete_at;
    field.createdBy = mockData.created_by;
    field.updatedBy = mockData.updated_by;
};

describe('PropertyFieldModel', () => {
    let operator: ServerDataOperator;
    let propertyField: PropertyFieldModel;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        const {database} = operator;

        await database.write(async () => {
            propertyField = await database.get<PropertyFieldModel>(PROPERTY_FIELD).create((f: PropertyFieldModel) => {
                applyMockData(f, TestHelper.createPropertyField('channel_1', 'channel', 0));
            });
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('=> should have the correct table name', () => {
        expect(PropertyFieldModel.table).toBe(PROPERTY_FIELD);
    });

    it('=> should declare has_many association to PropertyValue', () => {
        expect(PropertyFieldModel.associations).toBeDefined();
        expect(PropertyFieldModel.associations[PROPERTY_VALUE]).toEqual({
            type: 'has_many',
            foreignKey: 'field_id',
        });
    });

    it('=> should match stored data', () => {
        expect(propertyField.id).toBe('channel_1-prop_field_0');
        expect(propertyField.groupId).toBe('group_1');
        expect(propertyField.name).toBe('Property 1');
        expect(propertyField.type).toBe('text');
        expect(propertyField.objectType).toBe('card');
        expect(propertyField.targetId).toBe('channel_1');
        expect(propertyField.targetType).toBe('channel');
        expect(propertyField.protected).toBe(false);
        expect(propertyField.deleteAt).toBe(0);
    });

    it('=> should round-trip select-field attrs with options', async () => {
        const {database} = operator;
        let stored: PropertyFieldModel;

        await database.write(async () => {
            stored = await database.get<PropertyFieldModel>(PROPERTY_FIELD).create((f: PropertyFieldModel) => {
                applyMockData(f, TestHelper.createPropertyField('channel_1', 'channel', 1));
                f.type = 'select';
                f.attrs = {
                    sort_order: 1,
                    options: [
                        {id: 'opt1', name: 'Open', color: 'blue'},
                        {id: 'opt2', name: 'Done', color: 'green'},
                    ],
                };
            });
        });

        expect(stored!.attrs).toEqual({
            sort_order: 1,
            options: [
                {id: 'opt1', name: 'Open', color: 'blue'},
                {id: 'opt2', name: 'Done', color: 'green'},
            ],
        });
    });
});
