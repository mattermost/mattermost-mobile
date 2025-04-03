// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
        it('should observe channel permissions', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            const mockChannel = TestHelper.fakeChannelModel({
                id: 'channel1',
                type: General.OPEN_CHANNEL,
                teamId: 'team1',
            });

            operator.handleRole({
                roles: [{
                    id: 'system_user',
                    name: 'system_user',
                    permissions: [Permissions.CREATE_POST],
                }],
                prepareRecordsOnly: false,
            }).then(() => {
                observePermissionForChannel(
                    database,
                    mockChannel,
                    mockUser,
                    Permissions.CREATE_POST,
                    false,
                ).subscribe({
                    next: (hasPermission) => {
                        expect(hasPermission).toBe(true);
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should return default value when no user', (done) => {
            observePermissionForChannel(
                database,
                TestHelper.fakeChannelModel(),
                undefined,
                Permissions.CREATE_POST,
                true,
            ).subscribe({
                next: (hasPermission) => {
                    expect(hasPermission).toBe(true);
                    done();
                },
                error: done,
            });
        });
    });

    describe('observePermissionForTeam', () => {
        it('should observe team permissions', (done) => {
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

            Promise.all([
                operator.handleMyTeam({myTeams, prepareRecordsOnly: false}),
                operator.handleRole({
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
                })],
            ).then(() => {
                observePermissionForTeam(
                    database,
                    mockTeam,
                    mockUser,
                    Permissions.MANAGE_TEAM,
                    false,
                ).subscribe({
                    next: (hasPermission) => {
                        expect(hasPermission).toBe(true);
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should return default value when no team', (done) => {
            observePermissionForTeam(
                database,
                undefined,
                TestHelper.fakeUserModel(),
                Permissions.MANAGE_TEAM,
                true,
            ).subscribe({
                next: (hasPermission) => {
                    expect(hasPermission).toBe(true);
                    done();
                },
                error: done,
            });
        });
    });

    describe('observeCanManageChannelMembers', () => {
        it('should observe manage members permission for public channel', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            Promise.all([
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
                        id: 'system_admin',
                        name: 'system_admin',
                        permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS],
                    }],
                    prepareRecordsOnly: false,
                })]).then(() => {
                observeCanManageChannelMembers(
                    database,
                    'channel1',
                    mockUser,
                ).subscribe({
                    next: (canManage) => {
                        expect(canManage).toBe(true);
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should not allow managing default channel members', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    name: General.DEFAULT_CHANNEL,
                    type: General.OPEN_CHANNEL,
                    delete_at: 0,
                })],
                prepareRecordsOnly: false,
            }).then(() => {
                observeCanManageChannelMembers(
                    database,
                    'channel1',
                    mockUser,
                ).subscribe({
                    next: (canManage) => {
                        expect(canManage).toBe(false);
                        done();
                    },
                    error: done,
                });
            });
        });
    });

    describe('observePermissionForPost', () => {
        it('should observe post permissions', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_user',
            });

            const mockPost = TestHelper.fakePostModel({
                id: 'post1',
                channelId: 'channel1',
            });

            Promise.all([
                operator.handleChannel({
                    channels: [TestHelper.fakeChannel({
                        id: 'channel1',
                        type: General.OPEN_CHANNEL,
                        team_id: 'team1',
                    })],
                    prepareRecordsOnly: false,
                }),
                operator.handleRole({
                    roles: [{
                        id: 'system_user',
                        name: 'system_user',
                        permissions: [Permissions.CREATE_POST],
                    }],
                    prepareRecordsOnly: false,
                })],
            ).then(() => {
                observePermissionForPost(
                    database,
                    mockPost,
                    mockUser,
                    Permissions.CREATE_POST,
                    false,
                ).subscribe({
                    next: (hasPermission) => {
                        expect(hasPermission).toBe(true);
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should return default value when no channel exists', (done) => {
            const mockPost = TestHelper.fakePostModel({
                id: 'post1',
                channelId: 'nonexistent',
            });

            observePermissionForPost(
                database,
                mockPost,
                undefined,
                Permissions.CREATE_POST,
                true,
            ).subscribe({
                next: (hasPermission) => {
                    expect(hasPermission).toBe(true);
                    done();
                },
                error: done,
            });
        });
    });

    describe('observeCanManageChannelSettings', () => {
        it('should observe manage settings permission', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            Promise.all([
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
                        id: 'system_admin',
                        name: 'system_admin',
                        permissions: [Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES],
                    }],
                    prepareRecordsOnly: false,
                })],
            ).then(() => {
                observeCanManageChannelSettings(
                    database,
                    'channel1',
                    mockUser,
                ).subscribe({
                    next: (canManage) => {
                        expect(canManage).toBe(true);
                        done();
                    },
                    error: done,
                });
            });
        });

        it('should not allow managing deleted channel settings', (done) => {
            const mockUser = TestHelper.fakeUserModel({
                id: 'user1',
                roles: 'system_admin',
            });

            operator.handleChannel({
                channels: [TestHelper.fakeChannel({
                    id: 'channel1',
                    type: General.OPEN_CHANNEL,
                    delete_at: 123,
                })],
                prepareRecordsOnly: false,
            }).then(() => {
                observeCanManageChannelSettings(
                    database,
                    'channel1',
                    mockUser,
                ).subscribe({
                    next: (canManage) => {
                        expect(canManage).toBe(false);
                        done();
                    },
                    error: done,
                });
            });
        });
    });
});
