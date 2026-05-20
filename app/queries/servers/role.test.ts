// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {General, Permissions} from '@constants';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    queryRoles,
    getRoleById,
    queryRolesByNames,
    observePermissionForChannel,
    observePermissionForTeam,
    observePermissionForPost,
    observeCanManageChannelMembers,
    observeCanManageChannelSettings,
    observeCanManageChannelAutotranslations,
    observeCanManageSharedChannel,
} from './role';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('Role Queries', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('queryRoles', () => {
        it('should query all roles', async () => {
            await operator.handleRole({
                roles: [
                    {
                        id: 'role1',
                        name: 'admin',
                        permissions: [Permissions.MANAGE_SYSTEM],
                    },
                    {
                        id: 'role2',
                        name: 'user',
                        permissions: [Permissions.CREATE_POST],
                    },
                ],
                prepareRecordsOnly: false,
            });

            const roles = await queryRoles(database).fetch();
            expect(roles.length).toBe(2);
        });
    });

    describe('getRoleById', () => {
        it('should get role by id', async () => {
            await operator.handleRole({
                roles: [{
                    id: 'role1',
                    name: 'admin',
                    permissions: [Permissions.MANAGE_SYSTEM],
                }],
                prepareRecordsOnly: false,
            });

            const role = await getRoleById(database, 'role1');
            expect(role?.name).toBe('admin');
        });

        it('should return undefined for non-existent role', async () => {
            const role = await getRoleById(database, 'nonexistent');
            expect(role).toBeUndefined();
        });
    });

    describe('queryRolesByNames', () => {
        it('should query roles by names', async () => {
            await operator.handleRole({
                roles: [
                    {
                        id: 'role1',
                        name: 'admin',
                        permissions: [Permissions.MANAGE_SYSTEM],
                    },
                    {
                        id: 'role2',
                        name: 'user',
                        permissions: [Permissions.CREATE_POST],
                    },
                ],
                prepareRecordsOnly: false,
            });

            const roles = await queryRolesByNames(database, ['admin']).fetch();
            expect(roles.length).toBe(1);
            expect(roles[0].name).toBe('admin');
        });
    });

    describe('observePermissionForChannel', () => {
        it('should observe channel permissions', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            const mockChannel = TestHelper.fakeChannelModel({
                id: 'channel1',
                type: General.OPEN_CHANNEL,
                teamId: 'team1',
            });

            await operator.handleRole({
                roles: [{
                    id: 'system_user',
                    name: 'system_user',
                    permissions: [Permissions.CREATE_POST],
                }],
                prepareRecordsOnly: false,
            });

            const hasPermission = await firstValueFrom(observePermissionForChannel(
                database,
                mockChannel,
                mockUser,
                Permissions.CREATE_POST,
                false,
            ));
            expect(hasPermission).toBe(true);
        });

        it('should return default value when no user', async () => {
            const hasPermission = await firstValueFrom(observePermissionForChannel(
                database,
                TestHelper.fakeChannelModel(),
                undefined,
                Permissions.CREATE_POST,
                true,
            ));
            expect(hasPermission).toBe(true);
        });
    });

    describe('observePermissionForTeam', () => {
        it('should observe team permissions', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            const mockTeam = TestHelper.fakeTeamModel({
                id: 'team1',
            });

            const myTeams: MyTeam[] = [{
                id: mockTeam.id,
                roles: 'team_user',
            }];

            await operator.handleMyTeam({myTeams, prepareRecordsOnly: false});
            await operator.handleRole({
                roles: [
                    {
                        id: 'system_user',
                        name: 'system_user',
                        permissions: [Permissions.CREATE_POST],
                    },
                    {
                        id: 'team_user',
                        name: 'team_user',
                        permissions: [Permissions.MANAGE_TEAM],
                    },
                ],
                prepareRecordsOnly: false,
            });

            const hasPermission = await firstValueFrom(observePermissionForTeam(
                database,
                mockTeam,
                mockUser,
                Permissions.MANAGE_TEAM,
                false,
            ));

            expect(hasPermission).toBe(true);
        });

        it('should return default value when no team', async () => {
            const hasPermission = await firstValueFrom(observePermissionForTeam(
                database,
                undefined,
                TestHelper.fakeUserModel(),
                Permissions.MANAGE_TEAM,
                true,
            ));
            expect(hasPermission).toBe(true);
        });
    });

    describe('observeCanManageChannelMembers', () => {
        it('should observe manage members permission for public channel', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            await operator.handleRole({
                roles: [{
                    id: 'system_admin',
                    name: 'system_admin',
                    permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS],
                }],
                prepareRecordsOnly: false,
            });

            const canManage = await firstValueFrom(observeCanManageChannelMembers(
                database,
                'channel1',
                mockUser,
            ));
            expect(canManage).toBe(true);
        });

        it('should not allow managing default channel members', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    name: General.DEFAULT_CHANNEL,
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            const canManage = await firstValueFrom(observeCanManageChannelMembers(
                database,
                'channel1',
                mockUser,
            ));
            expect(canManage).toBe(false);
        });
    });

    describe('observePermissionForPost', () => {
        it('should observe post permissions', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            const mockPost = TestHelper.fakePostModel({
                id: 'post1',
                channelId: 'channel1',
            });

            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    team_id: 'team1',
                })],
                prepareRecordsOnly: false,
            });

            await operator.handleRole({
                roles: [{
                    id: 'system_user',
                    name: 'system_user',
                    permissions: [Permissions.CREATE_POST],
                }],
                prepareRecordsOnly: false,
            });

            const hasPermission = await firstValueFrom(observePermissionForPost(
                database,
                mockPost,
                mockUser,
                Permissions.CREATE_POST,
                false,
            ));

            expect(hasPermission).toBe(true);
        });

        it('should return default value when no channel exists', async () => {
            const mockPost = TestHelper.fakePostModel({
                id: 'post1',
                channelId: 'nonexistent',
            });

            const hasPermission = await firstValueFrom(observePermissionForPost(
                database,
                mockPost,
                undefined,
                Permissions.CREATE_POST,
                true,
            ));
            expect(hasPermission).toBe(true);
        });
    });

    describe('observeCanManageChannelSettings', () => {
        it('should observe manage settings permission', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            await operator.handleRole({
                roles: [{
                    id: 'system_admin',
                    name: 'system_admin',
                    permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES],
                }],
                prepareRecordsOnly: false,
            });

            const canManage = await firstValueFrom(observeCanManageChannelSettings(database, 'channel1', mockUser));
            expect(canManage).toBe(true);
        });

        it('should not allow managing deleted channel settings', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 123,
                })],
                prepareRecordsOnly: false,
            });

            const canManage = await firstValueFrom(observeCanManageChannelSettings(database, 'channel1', mockUser));
            expect(canManage).toBe(false);
        });
    });

    describe('observeCanManageChannelAutotranslations', () => {
        it('should emit false when EnableAutoTranslation is false', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'false'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(false);
        });

        it('should emit false when channel is not found', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'nonexistent', mockUser));
            expect(result).toBe(false);
        });

        it('should emit false when channel is deleted', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 123,
                })],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(false);
        });

        it('should emit false when channel is DM and RestrictDMAndGMAutotranslation is true', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.DM_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(false);
        });

        it('should emit true when channel is DM and RestrictDMAndGMAutotranslation is false', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.DM_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(true);
        });

        it('should emit true for open channel when user has MANAGE_PUBLIC_CHANNEL_AUTO_TRANSLATION', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'channel_admin',
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [{
                    id: 'channel_admin',
                    name: 'channel_admin',
                    permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_AUTO_TRANSLATION],
                }],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(true);
        });

        it('should emit true for private channel when user has MANAGE_PRIVATE_CHANNEL_AUTO_TRANSLATION', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'channel_admin',
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableAutoTranslation', value: 'true'},
                    {id: 'RestrictDMAndGMAutotranslation', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.PRIVATE_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [{
                    id: 'channel_admin',
                    name: 'channel_admin',
                    permissions: [Permissions.MANAGE_PRIVATE_CHANNEL_AUTO_TRANSLATION],
                }],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeCanManageChannelAutotranslations(database, 'channel1', mockUser));
            expect(result).toBe(true);
        });
    });

    describe('observeCanManageSharedChannel', () => {
        it('should emit true when channel exists and user has MANAGE_SHARED_CHANNELS', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'channel_admin',
            });

            await Promise.all([
                operator.handleChannel({
                    channels: [TestHelper.fakeChannel({
                        id: 'channel1',
                        type: General.OPEN_CHANNEL,
                        delete_at: 0,
                    })],
                    prepareRecordsOnly: false,
                }),
                operator.handleRole({
                    roles: [{
                        id: 'channel_admin',
                        name: 'channel_admin',
                        permissions: [Permissions.MANAGE_SHARED_CHANNELS],
                    }],
                    prepareRecordsOnly: false,
                }),
            ]);

            const subscriptionNext = jest.fn();
            const result = observeCanManageSharedChannel(database, 'channel1', mockUser);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should emit false when channel is not found', async () => {
            const mockUser = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});

            await operator.handleRole({
                roles: [{
                    id: 'system_user',
                    name: 'system_user',
                    permissions: [Permissions.MANAGE_SHARED_CHANNELS],
                }],
                prepareRecordsOnly: false,
            });

            const subscriptionNext = jest.fn();
            const result = observeCanManageSharedChannel(database, 'nonexistent', mockUser);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it('should emit false when channel is deleted', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'channel_admin',
            });

            await Promise.all([
                operator.handleChannel({
                    channels: [TestHelper.fakeChannel({
                        id: 'channel1',
                        type: General.OPEN_CHANNEL,
                        delete_at: 123,
                    })],
                    prepareRecordsOnly: false,
                }),
                operator.handleRole({
                    roles: [{
                        id: 'channel_admin',
                        name: 'channel_admin',
                        permissions: [Permissions.MANAGE_SHARED_CHANNELS],
                    }],
                    prepareRecordsOnly: false,
                }),
            ]);

            const subscriptionNext = jest.fn();
            const result = observeCanManageSharedChannel(database, 'channel1', mockUser);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it('should emit false when channel is DM', async () => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            await Promise.all([
                operator.handleChannel({
                    channels: [TestHelper.fakeChannel({
                        id: 'channel1',
                        type: General.DM_CHANNEL,
                        delete_at: 0,
                    })],
                    prepareRecordsOnly: false,
                }),
                operator.handleRole({
                    roles: [{
                        id: 'system_user',
                        name: 'system_user',
                        permissions: [Permissions.MANAGE_SHARED_CHANNELS],
                    }],
                    prepareRecordsOnly: false,
                }),
            ]);

            const subscriptionNext = jest.fn();
            const result = observeCanManageSharedChannel(database, 'channel1', mockUser);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });
    });
});
