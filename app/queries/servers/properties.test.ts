// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {setAccessControlGroupId} from '@actions/local/channel_attributes';
import {CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import DatabaseManager from '@database/manager';

import {
    observeChannelAttributeBanner,
    observeChannelAttributeFields,
    observeClassificationBannerState,
    observeResolvedChannelAttributes,
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

    // Normally published by the field fetch. The channel-field observables scope
    // themselves to the group and emit nothing without it.
    await setAccessControlGroupId(serverUrl, groupId);
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

describe('observeChannelAttributeFields', () => {
    it('should emit nothing until the group id is known, since another feature also stores channel fields', async () => {
        await seedFields([makeField({id: 'cf-1', object_type: 'channel'})]);

        await setAccessControlGroupId(serverUrl, '');
        const fields = await firstValueFrom(observeChannelAttributeFields(database));
        expect(fields).toHaveLength(0);
    });

    it('should exclude a field belonging to a different property group', async () => {
        await seedFields([
            makeField({id: 'cf-1', object_type: 'channel'}),
            makeField({id: 'other-1', object_type: 'channel', group_id: 'managed_channel_categories', name: 'category'}),
        ]);

        const fields = await firstValueFrom(observeChannelAttributeFields(database));
        expect(fields.map((f) => f.id)).toEqual(['cf-1']);
    });

    it('should exclude soft-deleted and non-channel fields', async () => {
        await seedFields([
            makeField({id: 'cf-1', object_type: 'channel'}),
            makeField({id: 'cf-2', object_type: 'channel', delete_at: 5000}),
            makeField({id: 'sys-1', object_type: 'system'}),
        ]);

        const fields = await firstValueFrom(observeChannelAttributeFields(database));
        expect(fields.map((f) => f.id)).toEqual(['cf-1']);
    });
});

describe('observeResolvedChannelAttributes', () => {
    const channelId = 'channel-123';

    it('should pair each channel field with this channel value, in display order', async () => {
        await seedFields([
            makeField({id: 'cf-2', name: 'program', object_type: 'channel', attrs: {options: [{id: 'aurora', name: 'AURORA'}]}}),
            makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}}),
        ]);
        await seedValues([
            makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'}),
            makeValue({id: 'cv-2', target_id: channelId, target_type: 'channel', field_id: 'cf-2', value: 'aurora'}),
        ]);

        const resolved = await firstValueFrom(observeResolvedChannelAttributes(database, channelId));
        expect(resolved.map((r) => [r.field.name, r.displayValue])).toEqual([
            ['classification', 'Secret'],
            ['program', 'AURORA'],
        ]);
    });

    it('should not leak another channel value into this channel', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: 'another-channel', target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const resolved = await firstValueFrom(observeResolvedChannelAttributes(database, channelId));
        expect(resolved).toHaveLength(1);
        expect(resolved[0].displayValue).toBe('');
    });
});

describe('observeChannelAttributeBanner', () => {
    const channelId = 'channel-123';

    it('should emit a channel banner from the channel value and field options', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const state = await firstValueFrom(observeChannelAttributeBanner(database, channelId));
        expect(state.hasBanner).toBe(true);
        expect(state.banner).toEqual({
            enabled: true,
            text: '**Secret**',
            background_color: '#FF0000',
        });
    });

    it('should emit no banner when there is no channel value', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel'})]);

        const state = await firstValueFrom(observeChannelAttributeBanner(database, channelId));
        expect(state.hasBanner).toBe(false);
    });

    it('should emit no banner when the channel value references a missing option', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret', color: '#FF0000'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'missing-level'})]);

        const state = await firstValueFrom(observeChannelAttributeBanner(database, channelId));
        expect(state.hasBanner).toBe(false);
    });
});
