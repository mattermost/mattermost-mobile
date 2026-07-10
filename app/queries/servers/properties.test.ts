// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import DatabaseManager from '@database/manager';

import {
    observeChannelClassificationBanner,
    observeClassificationBannerState,
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
    name: 'classification',
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
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}})]);
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
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel'})]);

        const state = await firstValueFrom(observeChannelClassificationBanner(database, channelId));
        expect(state.hasClassification).toBe(false);
    });

    it('should emit no classification when the channel value references a missing option', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'missing-level'})]);

        const state = await firstValueFrom(observeChannelClassificationBanner(database, channelId));
        expect(state.hasClassification).toBe(false);
    });
});
