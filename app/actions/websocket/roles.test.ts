// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRolesIfNeeded} from '@actions/remote/role';
import DatabaseManager from '@database/manager';
import {getRoleById} from '@queries/servers/role';
import {getCurrentUserId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import TestHelper from '@test/test_helper';

import {handleRoleUpdatedEvent, handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent} from './roles';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/remote/role');
jest.mock('@database/manager');
jest.mock('@queries/servers/role');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');

describe('WebSocket Roles Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const currentUserId = 'current-user-id';
    const roleId = 'role-id';
    const teamId = 'team-id';

    let operator: ServerDataOperator;
    let batchRecords: jest.SpyInstance;
    let handleRole: jest.SpyInstance;
    let handleMyTeam: jest.SpyInstance;
    let handleTeamMemberships: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;

        batchRecords = jest.spyOn(operator, 'batchRecords').mockResolvedValue();
        handleRole = jest.spyOn(operator, 'handleRole').mockResolvedValue([TestHelper.fakeRoleModel({id: 'role1'})]);
        handleMyTeam = jest.spyOn(operator, 'handleMyTeam').mockResolvedValue([]);
        handleTeamMemberships = jest.spyOn(operator, 'handleTeamMemberships').mockResolvedValue([]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleRoleUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    role: JSON.stringify({id: roleId}),
                },
            } as WebSocketMessage;
            await handleRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should handle missing role in database', async () => {
            jest.mocked(getRoleById).mockResolvedValue(undefined);
            const msg = {
                data: {
                    role: JSON.stringify({id: roleId}),
                },
            } as WebSocketMessage;
            await handleRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should update existing role', async () => {
            const mockRole = {
                id: roleId,
                name: 'test_role',
                permissions: ['permission1'],
            };
            jest.mocked(getRoleById).mockResolvedValue(TestHelper.fakeRoleModel({id: roleId}));
            const msg = {
                data: {
                    role: JSON.stringify(mockRole),
                },
            } as WebSocketMessage;

            await handleRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).toHaveBeenCalledWith({
                roles: [mockRole],
                prepareRecordsOnly: false,
            });
        });

        it('should handle invalid JSON in role data', async () => {
            jest.mocked(getRoleById).mockResolvedValue(TestHelper.fakeRoleModel({id: roleId}));
            const msg = {
                data: {
                    role: 'invalid json',
                },
            } as WebSocketMessage;

            await handleRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });
    });

    describe('handleUserRoleUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    user_id: currentUserId,
                    roles: 'role1 role2',
                },
            } as WebSocketMessage;
            await handleUserRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should handle different user', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue('different-user');
            const msg = {
                data: {
                    user_id: currentUserId,
                    roles: 'role1 role2',
                },
            } as WebSocketMessage;
            await handleUserRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should update roles and user', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue(currentUserId);
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({
                prepareUpdate: jest.fn(),
            }));
            jest.mocked(fetchRolesIfNeeded).mockResolvedValue({
                roles: [TestHelper.fakeRole({id: 'role1'})],
            });

            const msg = {
                data: {
                    user_id: currentUserId,
                    roles: 'role1 role2',
                },
            } as WebSocketMessage;

            await handleUserRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalled();
        });

        it('should handle missing current user', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue(currentUserId);
            jest.mocked(getCurrentUser).mockResolvedValue(undefined);
            jest.mocked(fetchRolesIfNeeded).mockResolvedValue({
                roles: [TestHelper.fakeRole({id: 'role1'})],
            });

            const msg = {
                data: {
                    user_id: currentUserId,
                    roles: 'role1',
                },
            } as WebSocketMessage;

            await handleUserRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalledWith(expect.arrayContaining([]), 'handleUserRoleUpdatedEvent');
        });

        it('should handle no new roles from fetchRolesIfNeeded', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue(currentUserId);
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({
                prepareUpdate: jest.fn(),
            }));
            jest.mocked(fetchRolesIfNeeded).mockResolvedValue({
                roles: [],
            });

            const msg = {
                data: {
                    user_id: currentUserId,
                    roles: 'role1',
                },
            } as WebSocketMessage;

            await handleUserRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).not.toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalled();
        });
    });

    describe('handleTeamMemberRoleUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    member: JSON.stringify({
                        user_id: currentUserId,
                        team_id: teamId,
                        roles: 'role1',
                        delete_at: 0,
                    }),
                },
            } as WebSocketMessage;
            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should handle deleted member', async () => {
            const msg = {
                data: {
                    member: JSON.stringify({
                        user_id: currentUserId,
                        team_id: teamId,
                        roles: 'role1',
                        delete_at: 1234,
                    }),
                },
            } as WebSocketMessage;
            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should handle different user', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue('different-user');
            const msg = {
                data: {
                    member: JSON.stringify({
                        user_id: currentUserId,
                        team_id: teamId,
                        roles: 'role1',
                        delete_at: 0,
                    }),
                },
            } as WebSocketMessage;
            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
        });

        it('should update roles, myTeam and teamMembership', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue(currentUserId);
            jest.mocked(fetchRolesIfNeeded).mockResolvedValue({
                roles: [TestHelper.fakeRole({id: 'role1'})],
            });

            const msg = {
                data: {
                    member: JSON.stringify({
                        user_id: currentUserId,
                        team_id: teamId,
                        roles: 'role1',
                        delete_at: 0,
                    }),
                },
            } as WebSocketMessage;

            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).toHaveBeenCalled();
            expect(handleMyTeam).toHaveBeenCalled();
            expect(handleTeamMemberships).toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalled();
        });

        it('should handle invalid JSON in member data', async () => {
            const msg = {
                data: {
                    member: 'invalid json',
                },
            } as WebSocketMessage;

            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            expect(handleRole).not.toHaveBeenCalled();
            expect(handleMyTeam).not.toHaveBeenCalled();
            expect(handleTeamMemberships).not.toHaveBeenCalled();
        });

        it('should handle no new roles from fetchRolesIfNeeded', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue(currentUserId);
            jest.mocked(fetchRolesIfNeeded).mockResolvedValue({
                roles: [],
            });

            const msg = {
                data: {
                    member: JSON.stringify({
                        user_id: currentUserId,
                        team_id: teamId,
                        roles: 'role1',
                        delete_at: 0,
                    }),
                },
            } as WebSocketMessage;

            await handleTeamMemberRoleUpdatedEvent(serverUrl, msg);

            expect(handleRole).not.toHaveBeenCalled();
            expect(handleMyTeam).toHaveBeenCalled();
            expect(handleTeamMemberships).toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalled();
        });
    });
});
