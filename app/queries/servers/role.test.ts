// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {General, License, Permissions} from '@constants';
import {RenderPermissionAction} from '@constants/access_control';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import RenderPermissionsStore, {RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';
import TestHelper from '@test/test_helper';

import {
    queryRoles,
    getRoleById,
    queryRolesByNames,
    observePermissionForChannel,
    observePermissionForChannelRBACOnly,
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

    describe('channel access policies', () => {
        const user = TestHelper.fakeUserModel({id: 'user1', roles: 'system_user'});
        const channel = TestHelper.fakeChannelModel({id: 'channel1', type: General.OPEN_CHANNEL, teamId: 'team1'});
        const writeDenied = {[RenderPermissionAction.ChannelWriteAccess]: {allowed: false, evaluated: true}};
        const managementDenied = {[RenderPermissionAction.ChannelManagementAccess]: {allowed: false, evaluated: true}};

        const setLicenseSku = (sku: string) => operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: sku}}],
            prepareRecordsOnly: false,
        });

        const storeDecisions = (channelId: string, decisions: Record<string, RenderPermissionDecision>) => {
            RenderPermissionsStore.setEntry(serverUrl, channelId, {epoch: 1, decisions}, RENDER_PERMISSIONS_TTL_MS);
        };

        beforeEach(async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                    {id: 'EnableAttributeBasedAccessControl', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            await setLicenseSku(License.SKU_SHORT_NAME.EnterpriseAdvanced);
            await operator.handleRole({
                roles: [{
                    id: 'system_user',
                    name: 'system_user',
                    permissions: [Permissions.CREATE_POST, Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES, Permissions.READ_CHANNEL],
                }],
                prepareRecordsOnly: false,
            });
        });

        afterEach(() => {
            RenderPermissionsStore.removeServer(serverUrl);
        });

        it('should deny a write permission when a write policy denies the channel', async () => {
            storeDecisions(channel.id, writeDenied);

            const canPost = await firstValueFrom(observePermissionForChannel(database, channel, user, Permissions.CREATE_POST, false));
            expect(canPost).toBe(false);
        });

        it('should deny a management permission when a management policy denies the channel', async () => {
            storeDecisions(channel.id, managementDenied);

            const canManage = await firstValueFrom(observePermissionForChannel(database, channel, user, Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES, false));
            expect(canManage).toBe(false);
        });

        it('should not apply a policy to a permission outside the write and management sets', async () => {
            storeDecisions(channel.id, {...writeDenied, ...managementDenied});

            const canRead = await firstValueFrom(observePermissionForChannel(database, channel, user, Permissions.READ_CHANNEL, false));
            expect(canRead).toBe(true);
        });

        it('should not apply a policy in a DM', async () => {
            const dm = TestHelper.fakeChannelModel({id: 'dm1', type: General.DM_CHANNEL, teamId: ''});
            storeDecisions(dm.id, writeDenied);

            const canPost = await firstValueFrom(observePermissionForChannel(database, dm, user, Permissions.CREATE_POST, false));
            expect(canPost).toBe(true);
        });

        it('should not apply a policy below Enterprise Advanced', async () => {
            await setLicenseSku(License.SKU_SHORT_NAME.Enterprise);
            storeDecisions(channel.id, writeDenied);

            const canPost = await firstValueFrom(observePermissionForChannel(database, channel, user, Permissions.CREATE_POST, false));
            expect(canPost).toBe(true);
        });

        it('should not apply a policy when attribute-based access control is not enforced', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                    {id: 'EnableAttributeBasedAccessControl', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
            storeDecisions(channel.id, writeDenied);

            const canPost = await firstValueFrom(observePermissionForChannel(database, channel, user, Permissions.CREATE_POST, false));
            expect(canPost).toBe(true);
        });

        it('should ignore a policy denial in the RBAC-only variant', async () => {
            storeDecisions(channel.id, writeDenied);

            const canPost = await firstValueFrom(observePermissionForChannelRBACOnly(database, channel, user, Permissions.CREATE_POST, false));
            expect(canPost).toBe(true);
        });

        it('should let the channel settings check ignore a policy denial when asked for the role grant only', async () => {
            await operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: channel.id, type: General.OPEN_CHANNEL, team_id: 'team1', delete_at: 0})],
                prepareRecordsOnly: false,
            });
            storeDecisions(channel.id, managementDenied);

            expect(await firstValueFrom(observeCanManageChannelSettings(database, channel.id, user))).toBe(false);
            expect(await firstValueFrom(observeCanManageChannelSettings(database, channel.id, user, true))).toBe(true);
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
