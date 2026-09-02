// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {General, Permissions} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeChannelAttributePermissions} from './channel_attributes';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'channel-attributes.query.test.com';
const channelId = 'channel-1';
const userId = 'user-1';

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
