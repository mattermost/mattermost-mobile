// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import DatabaseManager from '@database/manager';

import {
    getPropertyFieldById,
    observeChannelClassificationBanner,
    observeClassificationBannerState,
    queryClassificationFields,
    queryPropertyFieldsByGroupId,
    queryPropertyValuesByTargetId,
} from './properties';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'properties.query.test.com';
const groupId = 'access_control';
let database: Database;
let operator: ServerDataOperator;

const makeField = (overrides?: Partial<PropertyField>): PropertyField => ({
    id: 'sys-1',
    group_id: groupId,
    name: 'system_classification',
    type: 'select',
    object_type: 'system',
    target_type: 'system',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {
        actions: ['display_banner_top'],
        options: [
            {id: 'opt-ts', name: 'TOP SECRET', color: '#FCE83A'},
            {id: 'opt-s', name: 'SECRET', color: '#FF0000'},
        ],
    },
    ...overrides,
});

const makeValue = (overrides?: Partial<PropertyValue<string>>): PropertyValue<string> => ({
    id: 'val-1',
    target_id: CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID,
    target_type: 'system',
    group_id: groupId,
    field_id: 'sys-1',
    value: 'opt-ts',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

const seedFields = (fields: PropertyField[]) => operator.handlePropertyFields({fields, prepareRecordsOnly: false});
const seedValues = (values: Array<PropertyValue<string>>) => operator.handlePropertyValues({values, prepareRecordsOnly: false});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = db.database;
    operator = db.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('queryClassificationFields', () => {
    it('should return only classification-named fields', async () => {
        await seedFields([
            makeField(),
            makeField({id: 'cf-1', name: 'channel_classification', object_type: 'channel'}),
            makeField({id: 'other-1', name: 'some_other_field', object_type: 'user'}),
        ]);

        const result = await queryClassificationFields(database).fetch();
        const ids = result.map((f) => f.id).sort();
        expect(ids).toEqual(['cf-1', 'sys-1']);
    });
});

describe('queryPropertyFieldsByGroupId', () => {
    it('should return only fields for the given group', async () => {
        await seedFields([
            makeField(),
            makeField({id: 'other-group-field', group_id: 'other_group'}),
        ]);

        const result = await queryPropertyFieldsByGroupId(database, groupId).fetch();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('sys-1');
    });
});

describe('queryPropertyValuesByTargetId', () => {
    it('should return only values for the given target', async () => {
        await seedValues([
            makeValue(),
            makeValue({id: 'val-chan', target_id: 'channel-1'}),
        ]);

        const result = await queryPropertyValuesByTargetId(database, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID).fetch();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('val-1');
    });
});

describe('getPropertyFieldById', () => {
    it('should return the field when it exists', async () => {
        await seedFields([makeField()]);
        const field = await getPropertyFieldById(database, 'sys-1');
        expect(field?.id).toBe('sys-1');
    });

    it('should return undefined when the field does not exist', async () => {
        const field = await getPropertyFieldById(database, 'missing');
        expect(field).toBeUndefined();
    });
});

describe('observeClassificationBannerState', () => {
    it('should emit a visible banner state when field and value are present', async () => {
        await seedFields([makeField()]);
        await seedValues([makeValue()]);

        const state = await firstValueFrom(observeClassificationBannerState(database));
        expect(state).toEqual({visible: true, levelName: 'TOP SECRET', color: '#FCE83A'});
    });

    it('should emit a hidden banner state when the field is soft-deleted', async () => {
        await seedFields([makeField({delete_at: 5000})]);
        await seedValues([makeValue()]);

        const state = await firstValueFrom(observeClassificationBannerState(database));
        expect(state).toEqual({visible: false, levelName: '', color: ''});
    });

    it('should emit a hidden banner state when no data exists', async () => {
        const state = await firstValueFrom(observeClassificationBannerState(database));
        expect(state).toEqual({visible: false, levelName: '', color: ''});
    });
});

describe('observeChannelClassificationBanner', () => {
    const channelId = 'channel-123';

    it('should emit a channel banner from the channel value and field options', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'channel_classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const state = await firstValueFrom(observeChannelClassificationBanner(database, channelId));
        expect(state.hasClassification).toBe(true);
        expect(state.classificationBanner).toEqual({
            enabled: true,
            text: '**Secret**',
            background_color: '#FF0000',
        });
    });

    it('should emit no classification when there is no channel value', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'channel_classification', object_type: 'channel'})]);

        const state = await firstValueFrom(observeChannelClassificationBanner(database, channelId));
        expect(state.hasClassification).toBe(false);
    });
});
