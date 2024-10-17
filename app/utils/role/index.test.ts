// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {hasPermission} from '.';

import type RoleModel from '@typings/database/models/servers/role';

// Mock RoleModel type (simplified version)
const mockRoleModel = (permissions: string[]): RoleModel => ({
    id: 'role-id',
    name: 'role-name',
    permissions,
} as RoleModel);

describe('hasPermission', () => {
    it('should return false when roles array is empty', () => {
        const roles: RoleModel[] = [];

        const result = hasPermission(roles, 'some_permission');
        expect(result).toBe(false); // No roles, no permissions, expect false
    });

    it('should return false when a single role does not have the permission', () => {
        const roles: RoleModel[] = [mockRoleModel(['permission_1', 'permission_2'])];

        const result = hasPermission(roles, 'missing_permission');
        expect(result).toBe(false); // Role does not have 'missing_permission'
    });

    it('should return true when a single role has the permission', () => {
        const roles: RoleModel[] = [mockRoleModel(['permission_1', 'permission_2', 'desired_permission'])];

        const result = hasPermission(roles, 'desired_permission');
        expect(result).toBe(true); // Role has 'desired_permission'
    });

    it('should return false when multiple roles do not have the permission', () => {
        const roles: RoleModel[] = [
            mockRoleModel(['permission_1', 'permission_2']),
            mockRoleModel(['permission_3', 'permission_4']),
        ];

        const result = hasPermission(roles, 'missing_permission');
        expect(result).toBe(false); // None of the roles have 'missing_permission'
    });

    it('should return true when one of multiple roles has the permission', () => {
        const roles: RoleModel[] = [
            mockRoleModel(['permission_1', 'permission_2']),
            mockRoleModel(['desired_permission', 'permission_4']),
        ];

        const result = hasPermission(roles, 'desired_permission');
        expect(result).toBe(true); // Second role has 'desired_permission'
    });
});
