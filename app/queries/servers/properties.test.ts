// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {waitFor} from '@testing-library/react-native';
import {firstValueFrom} from 'rxjs';

import {setAccessControlGroupId} from '@actions/local/channel_attributes';
import {License} from '@constants';
import {FEATURE_FLAG_CHANNEL_ATTRIBUTES, FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED} from '@constants/channel_attributes';
import {CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID, FEATURE_FLAG_CLASSIFICATION_MARKINGS} from '@constants/classification';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    observeChannelAttributeBanner,
    observeChannelAttributeFields,
    observeChannelAttributesRequiredEnabled,
    observeClassificationBannerState,
    observeClassificationMarkingsEnabled,
    observeResolvedChannelAttributes,
} from './properties';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {ResolvedChannelAttribute} from '@utils/channel_attributes';

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

    it('should ignore fields and values from another property group', async () => {
        await seedFields([makeField({group_id: 'other-group'})]);
        await seedValues([makeValue({group_id: 'other-group'})]);

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

    it('should re-emit when an option of a multi-valued attribute changes color', async () => {
        const options = [{id: 'noforn', name: 'NOFORN', color: '#FF0000'}, {id: 'orcon', name: 'ORCON', color: '#00FF00'}];
        await seedFields([makeField({id: 'cf-1', name: 'dissemination', type: 'multiselect', object_type: 'channel', attrs: {options}})]);
        await operator.handlePropertyValues({
            values: [{...makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1'}), value: ['noforn', 'orcon']}],
            prepareRecordsOnly: false,
        });

        const emissions: string[][] = [];
        const subscription = observeResolvedChannelAttributes(database, channelId).subscribe((resolved) => {
            emissions.push(resolved[0].displayValues.map((entry) => entry.color ?? ''));
        });

        await seedFields([makeField({
            id: 'cf-1',
            name: 'dissemination',
            type: 'multiselect',
            object_type: 'channel',
            update_at: 2000,
            attrs: {options: [options[0], {...options[1], color: '#0000FF'}]},
        })]);
        await waitFor(() => expect(emissions).toHaveLength(2));
        subscription.unsubscribe();

        expect(emissions[1]).toEqual(['#FF0000', '#0000FF']);
    });

    it('should not leak another channel value into this channel', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret'}]}})]);
        await seedValues([makeValue({id: 'cv-1', target_id: 'another-channel', target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const resolved = await firstValueFrom(observeResolvedChannelAttributes(database, channelId));
        expect(resolved).toHaveLength(1);
        expect(resolved[0].displayValue).toBe('');
    });

    it('should ignore a value for the same target from another property group', async () => {
        await seedFields([makeField({id: 'cf-1', name: 'classification', object_type: 'channel', attrs: {options: [{id: 'level-secret', name: 'Secret'}]}})]);
        await seedValues([makeValue({
            id: 'cv-1',
            group_id: 'other-group',
            target_id: channelId,
            target_type: 'channel',
            field_id: 'cf-1',
            value: 'level-secret',
        })]);

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

describe('observeResolvedChannelAttributes re-emission', () => {
    const channelId = 'channel-123';

    const channelField = (attrs: PropertyFieldAttrs, overrides?: Partial<PropertyField>) => makeField({
        id: 'cf-1',
        name: 'classification',
        object_type: 'channel',
        type: 'rank',
        attrs,
        ...overrides,
    });

    const options = [
        {id: 'level-public', name: 'Public', color: '#00FF00', rank: 1},
        {id: 'level-secret', name: 'Secret', color: '#FF0000', rank: 2},
    ];

    // Records every emission, so a change the comparator swallows shows up as a missing one.
    const emissionsWhile = async (mutate: () => Promise<void>) => {
        const emissions: ResolvedChannelAttribute[][] = [];
        const subscription = observeResolvedChannelAttributes(database, channelId).subscribe((resolved) => {
            emissions.push(resolved);
        });

        await mutate();

        // WatermelonDB delivers a column change on a later tick, so unsubscribing
        // straight after the write would miss the emission being asserted on.
        await new Promise((resolve) => setTimeout(resolve, 0));

        subscription.unsubscribe();
        return emissions;
    };

    it('should re-emit when a change policy is narrowed, even though the rendered value is identical', async () => {
        await seedFields([channelField({options, change_policy: 'any'})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const emissions = await emissionsWhile(async () => {
            await seedFields([channelField({options, change_policy: 'raise_only'})]);
        });

        expect(emissions.length).toBeGreaterThan(1);
        const last = emissions[emissions.length - 1];
        expect(last[0].displayValue).toBe('Secret');
        expect(last[0].field.attrs?.change_policy).toBe('raise_only');
    });

    it('should re-emit when the permission tier is revoked', async () => {
        await seedFields([channelField({options}, {permission_values: 'member'})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const emissions = await emissionsWhile(async () => {
            await seedFields([channelField({options}, {permission_values: 'none'})]);
        });

        expect(emissions.length).toBeGreaterThan(1);
        expect(emissions[emissions.length - 1][0].field.permissionValues).toBe('none');
    });

    it('should re-emit when an option is removed from the field', async () => {
        await seedFields([channelField({options})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const emissions = await emissionsWhile(async () => {
            await seedFields([channelField({options: [options[1]]})]);
        });

        expect(emissions.length).toBeGreaterThan(1);
        expect(emissions[emissions.length - 1][0].field.attrs?.options).toHaveLength(1);
    });

    it('should re-emit when an option rename collides under naive \':\'/\',\' joining but is a real change', async () => {
        // Renaming the remaining option to "x,b:2:blue:y" yields the same string a naive
        // ':'/','-joined signature gives for options a and b, so it would see no change.
        await seedFields([channelField({options: [
            {id: 'a', name: 'x', color: 'red', rank: 1},
            {id: 'b', name: 'y', color: 'blue', rank: 2},
        ]})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'a'})]);

        const emissions = await emissionsWhile(async () => {
            await seedFields([channelField({options: [
                {id: 'a', name: 'x,b:2:blue:y', color: 'red', rank: 1},
            ]})]);
        });

        expect(emissions.length).toBeGreaterThan(1);
        expect(emissions[emissions.length - 1][0].field.attrs?.options).toHaveLength(1);
    });

    it('should re-emit when the stored option id changes to another with the same rendered name and colour', async () => {
        // Both options render the same; only rawValue in the signature catches the switch.
        await seedFields([channelField({options: [
            {id: 'a', name: 'Dup', color: '#123456', rank: 1},
            {id: 'b', name: 'Dup', color: '#123456', rank: 2},
        ]})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'a'})]);

        const emissions = await emissionsWhile(async () => {
            await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'b'})]);
        });

        expect(emissions.length).toBeGreaterThan(1);
        expect(emissions[emissions.length - 1][0].rawValue).toBe('b');
    });

    it('should not re-emit when nothing the surfaces read has changed', async () => {
        await seedFields([channelField({options})]);
        await seedValues([makeValue({id: 'cv-1', target_id: channelId, target_type: 'channel', field_id: 'cf-1', value: 'level-secret'})]);

        const emissions = await emissionsWhile(async () => {
            await seedFields([channelField({options}, {update_at: 5000})]);
        });

        expect(emissions).toHaveLength(1);
    });
});

describe('feature flag observables', () => {
    const seedConfig = (configs: Array<{id: string; value: string}>) => operator.handleConfigs({
        configs,
        configsToDelete: [],
        prepareRecordsOnly: false,
    });

    const emissionsWhile = async (observable: ReturnType<typeof observeClassificationMarkingsEnabled>, mutate: () => Promise<unknown>) => {
        const emissions: boolean[] = [];
        const subscription = observable.subscribe((value) => emissions.push(value));
        await mutate();
        await waitFor(() => expect(emissions.length).toBeGreaterThan(1));
        subscription.unsubscribe();
        return emissions;
    };

    describe('observeChannelAttributesRequiredEnabled', () => {
        beforeEach(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });
            await seedConfig([
                {id: 'BuildEnterpriseReady', value: 'true'},
                {id: FEATURE_FLAG_CHANNEL_ATTRIBUTES, value: 'true'},
                {id: FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED, value: 'false'},
            ]);
        });

        it('should follow the required flag as it is turned on and off', async () => {
            const observable = observeChannelAttributesRequiredEnabled(database);

            expect(await emissionsWhile(observable, () => seedConfig([{id: FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED, value: 'true'}]))).toEqual([false, true]);
            expect(await emissionsWhile(observable, () => seedConfig([{id: FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED, value: 'false'}]))).toEqual([true, false]);
        });

        it('should be off when channel attributes are off, whatever the required flag says', async () => {
            await seedConfig([
                {id: FEATURE_FLAG_CHANNEL_ATTRIBUTES, value: 'false'},
                {id: FEATURE_FLAG_CHANNEL_ATTRIBUTES_REQUIRED, value: 'true'},
            ]);

            expect(await firstValueFrom(observeChannelAttributesRequiredEnabled(database))).toBe(false);
        });
    });

    describe('observeClassificationMarkingsEnabled', () => {
        it('should follow the classification markings flag', async () => {
            await seedConfig([{id: FEATURE_FLAG_CLASSIFICATION_MARKINGS, value: 'false'}]);

            const emissions = await emissionsWhile(observeClassificationMarkingsEnabled(database), () => seedConfig([{id: FEATURE_FLAG_CLASSIFICATION_MARKINGS, value: 'true'}]));

            expect(emissions).toEqual([false, true]);
        });
    });
});
