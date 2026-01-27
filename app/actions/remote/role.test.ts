// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryRoles} from '@queries/servers/role';
import {logDebug} from '@utils/log';

import {fetchRoles, fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database, Query} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';

jest.mock('@managers/network_manager');
jest.mock('@database/manager');
jest.mock('@queries/servers/role');
jest.mock('@utils/log');
jest.mock('./session');

describe('role', () => {
    const serverUrl = 'https://example.com';
    const mockClient = {
        getRolesByNames: jest.fn(),
    } as unknown as Client;
    const mockServerDatabase = {
        database: {} as unknown as Database,
        operator: {
            handleRole: jest.fn(),
        } as unknown as ServerDataOperator,
    } as ServerDatabase;

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    describe('fetchRolesIfNeeded', () => {
        it('should return empty roles if updatedRoles is node defined', async () => {
            const emptyRoles: string[] = [];

            const result = await fetchRolesIfNeeded(serverUrl, emptyRoles);

            expect(result).toEqual({roles: []});
        });

        it('should fetch roles and return empty roles when force flag is false and there are no new roles to update', async () => {

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            jest.mocked(NetworkManager.getClient).mockImplementation((_url: string) => mockClient);
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue(mockServerDatabase);

            const updatedRoles = ['role-1', 'role-2', 'role-3'];
            const roleResponse: RoleModel[] = [];
            updatedRoles.forEach((role) => {
                roleResponse.push({name: role} as RoleModel);
            });
            jest.mocked(queryRoles).mockReturnValue({
                fetch: jest.fn().mockResolvedValue(roleResponse),
            } as unknown as ReturnType<typeof queryRoles>);

            const result = await fetchRolesIfNeeded(serverUrl, updatedRoles, false, false);

            expect(result).toEqual({roles: []});
        });

        it('should fetch roles and return roles when force flag is false, fetchOnly is false and there are no new roles to update', async () => {

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            jest.mocked(NetworkManager.getClient).mockImplementation((_url: string) => mockClient);

            jest.mocked(mockClient.getRolesByNames).
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                mockImplementation((rolesNames: string[], groupLabel?: RequestGroupLabel) => {
                    const roles: Role[] = [];
                    rolesNames.forEach((role) => {
                        roles.push({name: role} as Role);
                    });
                    return Promise.resolve(roles);
                });
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue(mockServerDatabase);

            const updatedRoles = ['role-3', 'role-4', 'role-5'];
            const roleResponse: RoleModel[] = [
                {name: 'role-1'} as RoleModel,
                {name: 'role-2'} as RoleModel,
            ];

            jest.mocked(queryRoles).mockReturnValue({
                fetch: jest.fn().mockResolvedValue(roleResponse),
            } as unknown as Query<RoleModel>);

            const result = await fetchRolesIfNeeded(serverUrl, updatedRoles, false, false);

            expect(result.roles?.length).toBeGreaterThan(0);
            expect(queryRoles).toHaveBeenCalled();
            expect(mockClient.getRolesByNames).toHaveBeenCalled();
            expect(mockServerDatabase.operator.handleRole).toHaveBeenCalled();
        });

        it('should return an object with error property when the request fails', async () => {

            const updatedRoles = ['role-1', 'role-2'];
            const error = new Error('Client error');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            jest.mocked(NetworkManager.getClient).mockImplementation((_url: string) => {
                throw error;
            });

            const result = await fetchRolesIfNeeded(serverUrl, updatedRoles);

            expect(result).toHaveProperty('error');
            expect(logDebug).toHaveBeenCalledWith('error on fetchRolesIfNeeded', expect.any(String));
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        });
    });

    describe('fetchRoles', () => {
        it('should return empty roles array when teamMembership and channelMembership are empty', async () => {
            const teamMembership: TeamMembership[] = [];
            const channelMembership: ChannelMembership[] = [];

            const result = await fetchRoles(serverUrl, teamMembership, channelMembership);

            expect(result).toEqual({roles: []});
        });

        it('should return roles when teamMembership and channelMembership have roles', async () => {
            // hack that makes fetchRolesIfNeeded return empty roles to avoid mocking it
            const roleNames = '    ';
            const teamMembership: TeamMembership[] = [{roles: roleNames} as TeamMembership];
            const channelMembership: ChannelMembership[] = [{roles: roleNames} as ChannelMembership];
            const userProfile = {id: 'user-1', roles: roleNames} as UserProfile;
            const requestGroupLabel: RequestGroupLabel = 'Cold Start';

            const result = await fetchRoles(serverUrl, teamMembership, channelMembership, userProfile, false, false, requestGroupLabel);

            expect(result).toEqual({roles: []});
        });
    });
});

