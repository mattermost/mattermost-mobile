// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {setAccessControlGroupId} from '@actions/local/channel_attributes';
import {General, Permissions} from '@constants';
import {CHANNEL_ATTRIBUTE_OBJECT_TYPE} from '@constants/channel_attributes';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeChannelAttributeCreationBlocked, observeChannelAttributePermissions, observeCreatableChannelAttributeFields} from './channel_attributes';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {ChannelAttributeField} from '@utils/channel_attributes';

const serverUrl = 'channel-attributes.query.test.com';
const channelId = 'channel-1';
const userId = 'user-1';
const groupId = 'access_control';

let database: Database;
let operator: ServerDataOperator;

const seedUser = async (roles: string) => {
    await operator.handleUsers({
        users: [TestHelper.fakeUser({id: userId, roles})],
        prepareRecordsOnly: false,
    });
    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: userId}],
        prepareRecordsOnly: false,
    });
};

const seedChannel = (overrides?: Partial<Channel>) => operator.handleChannel({
    channels: [TestHelper.fakeChannel({
        id: channelId,
        type: General.OPEN_CHANNEL,
        delete_at: 0,
        ...overrides,
    })],
    prepareRecordsOnly: false,
});

const seedRole = (name: string, permissions: string[]) => operator.handleRole({
    roles: [{id: name, name, permissions}],
    prepareRecordsOnly: false,
});

const makeField = (overrides?: Partial<PropertyField>): PropertyField => ({
    id: 'field-1',
    group_id: groupId,
    name: 'sensitivity',
    type: 'select',
    object_type: CHANNEL_ATTRIBUTE_OBJECT_TYPE,
    target_type: 'channel',
    target_id: '',
    delete_at: 0,
    create_at: 1000,
    update_at: 1000,
    attrs: {required: true},
    permission_values: 'member',
    ...overrides,
});

const seedFields = (fields: PropertyField[]) => operator.handlePropertyFields({fields, prepareRecordsOnly: false});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const db = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    database = db.database;
    operator = db.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('observeChannelAttributePermissions', () => {
    it('should resolve the public-channel properties permission on an open channel', async () => {
        await seedUser('channel_admin');
        await seedChannel({type: General.OPEN_CHANNEL});
        await seedRole('channel_admin', [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions).toEqual({
            canManageChannelProperties: true,
            canManageChannelRoles: false,
            canManageSystem: false,
        });
    });

    it('should resolve the private-channel properties permission on a private channel', async () => {
        await seedUser('channel_admin');
        await seedChannel({type: General.PRIVATE_CHANNEL});
        await seedRole('channel_admin', [Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageChannelProperties).toBe(true);
    });

    it('should not accept the public permission on a private channel', async () => {
        await seedUser('channel_admin');
        await seedChannel({type: General.PRIVATE_CHANNEL});
        await seedRole('channel_admin', [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageChannelProperties).toBe(false);
    });

    it('should report the two tier permissions separately', async () => {
        await seedUser('system_admin');
        await seedChannel();
        await seedRole('system_admin', [
            Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES,
            Permissions.MANAGE_CHANNEL_ROLES,
            Permissions.MANAGE_SYSTEM,
        ]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions).toEqual({
            canManageChannelProperties: true,
            canManageChannelRoles: true,
            canManageSystem: true,
        });
    });

    it('should resolve to nothing on a DM, where mobile offers no attributes', async () => {
        await seedUser('system_admin');
        await seedChannel({type: General.DM_CHANNEL});
        await seedRole('system_admin', [Permissions.MANAGE_SYSTEM, Permissions.MANAGE_CHANNEL_ROLES]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageChannelProperties).toBe(false);
        expect(permissions.canManageSystem).toBe(false);
    });

    it('should resolve to nothing on a GM', async () => {
        await seedUser('system_admin');
        await seedChannel({type: General.GM_CHANNEL});
        await seedRole('system_admin', [Permissions.MANAGE_SYSTEM]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageSystem).toBe(false);
    });

    it('should resolve to nothing on an archived channel', async () => {
        await seedUser('system_admin');
        await seedChannel({delete_at: 1234});
        await seedRole('system_admin', [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES, Permissions.MANAGE_SYSTEM]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageChannelProperties).toBe(false);
    });

    it('should resolve to nothing when the channel is not in the database', async () => {
        await seedUser('system_admin');
        await seedRole('system_admin', [Permissions.MANAGE_SYSTEM]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, 'missing-channel'));

        expect(permissions.canManageSystem).toBe(false);
    });

    it('should resolve to nothing when there is no current user', async () => {
        await seedChannel();
        await seedRole('system_admin', [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES]);

        const permissions = await firstValueFrom(observeChannelAttributePermissions(database, channelId));

        expect(permissions.canManageChannelProperties).toBe(false);
    });
});

describe('observeCreatableChannelAttributeFields', () => {
    beforeEach(async () => {
        await setAccessControlGroupId(serverUrl, groupId);
    });

    it('should include a required, member-tier field for any user', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1'})]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields.map((f) => f.id)).toEqual(['f1']);
    });

    it('should drop an optional field: it is reachable later, not at creation', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', attrs: {required: false}})]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields).toHaveLength(0);
    });

    it('should drop a required sysadmin-tier field from a caller without manage_system', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', permission_values: 'sysadmin'})]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields).toHaveLength(0);
    });

    it('should include a required sysadmin-tier field for a caller with manage_system', async () => {
        await seedUser('system_admin');
        await seedRole('system_admin', [Permissions.MANAGE_SYSTEM]);
        await seedFields([makeField({id: 'f1', permission_values: 'sysadmin'})]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields.map((f) => f.id)).toEqual(['f1']);
    });

    it('should drop a required field with no mobile editor', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', type: 'date'})]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields).toHaveLength(0);
    });

    it('should order the result the same way as Channel Info', async () => {
        await seedUser('system_user');
        await seedFields([
            makeField({id: 'f-b', name: 'b-field', attrs: {required: true, sort_order: 2}}),
            makeField({id: 'f-a', name: 'a-field', attrs: {required: true, sort_order: 1}}),
        ]);

        const fields = await firstValueFrom(observeCreatableChannelAttributeFields(database));

        expect(fields.map((f) => f.id)).toEqual(['f-a', 'f-b']);
    });

    // WatermelonDB updates a record in place and re-emits the same model
    // instance, so a comparator that misses one of the keys the form actually
    // renders would silently swallow a live edit to that key. One test per
    // signature key that isn't already covered by the filtering tests above.
    describe('re-emission on an in-place field edit', () => {
        const emissionsWhile = async (mutate: () => Promise<void>) => {
            const emissions: ChannelAttributeField[][] = [];
            const subscription = observeCreatableChannelAttributeFields(database).subscribe((fields) => {
                emissions.push(fields);
            });

            await mutate();
            await new Promise((resolve) => setTimeout(resolve, 0));

            subscription.unsubscribe();
            return emissions;
        };

        it('should re-emit when the field is renamed', async () => {
            // update_at moves alongside name here because that is what a real
            // server-side edit does — observeChannelAttributeFields itself only
            // tracks update_at/delete_at/attrs/permission_values (name is not a
            // watched column), so a rename that somehow left update_at behind
            // would not reach this observable at all regardless of the signature.
            await seedUser('system_user');
            await seedFields([makeField({id: 'f1', name: 'original'})]);

            const emissions = await emissionsWhile(async () => {
                await seedFields([makeField({id: 'f1', name: 'renamed', update_at: 2000})]);
            });

            expect(emissions.length).toBeGreaterThan(1);
            expect(emissions[emissions.length - 1][0].name).toBe('renamed');
        });

        it('should re-emit when an option is added to the field', async () => {
            const option = {id: 'opt-1', name: 'Low', color: '#00AA00', rank: 1};
            await seedUser('system_user');
            await seedFields([makeField({id: 'f1', attrs: {required: true, options: []}})]);

            const emissions = await emissionsWhile(async () => {
                await seedFields([makeField({id: 'f1', attrs: {required: true, options: [option]}})]);
            });

            expect(emissions.length).toBeGreaterThan(1);
            expect(emissions[emissions.length - 1][0].attrs?.options).toHaveLength(1);
        });

        it('should re-emit when sort_order changes', async () => {
            await seedUser('system_user');
            await seedFields([
                makeField({id: 'f-a', name: 'a-field', attrs: {required: true, sort_order: 1}}),
                makeField({id: 'f-b', name: 'b-field', attrs: {required: true, sort_order: 2}}),
            ]);

            const emissions = await emissionsWhile(async () => {
                await seedFields([makeField({id: 'f-a', name: 'a-field', attrs: {required: true, sort_order: 3}})]);
            });

            expect(emissions.length).toBeGreaterThan(1);
            expect(emissions[emissions.length - 1].map((f) => f.id)).toEqual(['f-b', 'f-a']);
        });
    });
});

describe('observeChannelAttributeCreationBlocked', () => {
    beforeEach(async () => {
        await setAccessControlGroupId(serverUrl, groupId);
    });

    it('should report blocked for a required, member-tier field with no mobile editor', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', type: 'date'})]);

        const blocked = await firstValueFrom(observeChannelAttributeCreationBlocked(database));

        expect(blocked).toBe(true);
    });

    it('should not report blocked for a required, editable field', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1'})]);

        const blocked = await firstValueFrom(observeChannelAttributeCreationBlocked(database));

        expect(blocked).toBe(false);
    });

    it('should not report blocked for an optional field with no mobile editor: nothing requires it', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', type: 'date', attrs: {required: false}})]);

        const blocked = await firstValueFrom(observeChannelAttributeCreationBlocked(database));

        expect(blocked).toBe(false);
    });

    it('should not report blocked for a sysadmin-tier field with no mobile editor when the caller lacks manage_system: the server drops the requirement too', async () => {
        await seedUser('system_user');
        await seedFields([makeField({id: 'f1', type: 'date', permission_values: 'sysadmin'})]);

        const blocked = await firstValueFrom(observeChannelAttributeCreationBlocked(database));

        expect(blocked).toBe(false);
    });

    it('should report blocked for a sysadmin-tier field with no mobile editor when the caller has manage_system', async () => {
        await seedUser('system_admin');
        await seedRole('system_admin', [Permissions.MANAGE_SYSTEM]);
        await seedFields([makeField({id: 'f1', type: 'date', permission_values: 'sysadmin'})]);

        const blocked = await firstValueFrom(observeChannelAttributeCreationBlocked(database));

        expect(blocked).toBe(true);
    });
});
