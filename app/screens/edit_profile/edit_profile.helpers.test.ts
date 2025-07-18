// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildUserInfoUpdates} from './edit_profile.helpers';

import type UserModel from '@typings/database/models/servers/user';
import type {UserInfo} from '@typings/screens/edit_profile';

describe('buildUserInfoUpdates', () => {
    // Mock user data for testing
    const mockCurrentUser = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        nickname: 'Johnny',
        position: 'Developer',
        username: 'johndoe',
        authService: '',
    } as UserModel;

    const baseUserInfo: UserInfo = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        nickname: 'Johnny',
        position: 'Developer',
        username: 'johndoe',
        customAttributes: {},
    };

    const unlockedFieldConfig = {
        email: false,
        firstName: false,
        lastName: false,
        nickname: false,
        position: false,
        username: false,
    };

    describe('No changes', () => {
        it('should return empty object when no fields have changed', () => {
            const result = buildUserInfoUpdates(baseUserInfo, mockCurrentUser, unlockedFieldConfig);
            expect(result).toEqual({});
        });

        it('should return empty object when userInfo matches currentUser exactly', () => {
            const identicalUserInfo: UserInfo = {
                email: mockCurrentUser.email,
                firstName: mockCurrentUser.firstName,
                lastName: mockCurrentUser.lastName,
                nickname: mockCurrentUser.nickname,
                position: mockCurrentUser.position,
                username: mockCurrentUser.username,
                customAttributes: {},
            };

            const result = buildUserInfoUpdates(identicalUserInfo, mockCurrentUser, unlockedFieldConfig);
            expect(result).toEqual({});
        });
    });

    describe('Single field changes', () => {
        it('should detect firstName change and convert to first_name', () => {
            const userInfo = {...baseUserInfo, firstName: 'Jane'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
            });
        });

        it('should detect lastName change and convert to last_name', () => {
            const userInfo = {...baseUserInfo, lastName: 'Smith'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                last_name: 'Smith',
            });
        });

        it('should detect nickname change (no conversion needed)', () => {
            const userInfo = {...baseUserInfo, nickname: 'JD'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                nickname: 'JD',
            });
        });

        it('should detect position change (no conversion needed)', () => {
            const userInfo = {...baseUserInfo, position: 'Senior Developer'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                position: 'Senior Developer',
            });
        });

        it('should detect username change (no conversion needed)', () => {
            const userInfo = {...baseUserInfo, username: 'janedoe'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                username: 'janedoe',
            });
        });

        it('should detect email change (no conversion needed)', () => {
            const userInfo = {...baseUserInfo, email: 'jane@example.com'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                email: 'jane@example.com',
            });
        });
    });

    describe('Multiple field changes', () => {
        it('should handle multiple changed fields with proper conversions', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: 'Jane',
                lastName: 'Smith',
                position: 'Senior Developer',
                nickname: 'JS',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
                last_name: 'Smith',
                position: 'Senior Developer',
                nickname: 'JS',
            });
        });

        it('should handle all fields changed at once', () => {
            const userInfo = {
                email: 'new@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
                nickname: 'JS',
                position: 'CTO',
                username: 'janesmith',
                customAttributes: {},
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                email: 'new@example.com',
                first_name: 'Jane',
                last_name: 'Smith',
                nickname: 'JS',
                position: 'CTO',
                username: 'janesmith',
            });
        });
    });

    describe('Field locking behavior', () => {
        it('should exclude locked fields even if they changed', () => {
            const userInfo = {...baseUserInfo, firstName: 'Jane'};
            const lockedFieldConfig = {...unlockedFieldConfig, firstName: true};

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, lockedFieldConfig);

            expect(result).toEqual({});
        });

        it('should include unlocked fields and exclude locked ones in mixed scenario', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: 'Jane', // This will be locked
                lastName: 'Smith', // This will be unlocked
                position: 'Senior Dev', // This will be locked
                nickname: 'JS', // This will be unlocked
            };

            const mixedLockConfig = {
                email: false,
                firstName: true, // locked
                lastName: false, // unlocked
                nickname: false, // unlocked
                position: true, // locked
                username: false,
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, mixedLockConfig);

            expect(result).toEqual({
                last_name: 'Smith',
                nickname: 'JS',
            });
        });

        it('should handle all fields locked scenario', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: 'Jane',
                lastName: 'Smith',
                position: 'Senior Developer',
            };

            const allLockedConfig = {
                email: true,
                firstName: true,
                lastName: true,
                nickname: true,
                position: true,
                username: true,
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, allLockedConfig);

            expect(result).toEqual({});
        });
    });

    describe('Trimming behavior', () => {
        it('should trim whitespace from new values', () => {
            const userInfo = {...baseUserInfo, firstName: '  Jane  '};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
            });
        });

        it('should not include field if trimmed value equals current value', () => {
            const userInfo = {...baseUserInfo, firstName: '  John  '}; // Trims to 'John', same as current
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({});
        });

        it('should handle multiple fields with trimming', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: '  Jane  ',
                lastName: '  Smith  ',
                position: '  Senior Developer  ',
                nickname: '  Johnny  ', // This trims to same as current, so should be excluded
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
                last_name: 'Smith',
                position: 'Senior Developer',
            });
        });

        it('should handle extreme whitespace scenarios', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: '\n\t  Jane  \n\t',
                lastName: '',
                position: '   ',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
                last_name: '',
                position: '',
            });
        });
    });

    describe('Edge cases and null/undefined handling', () => {
        it('should handle undefined values in userInfo', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: undefined as any,
                lastName: 'Smith',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: '',
                last_name: 'Smith',
            });
        });

        it('should handle null values in userInfo', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: null as any,
                position: 'Senior Dev',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: '',
                position: 'Senior Dev',
            });
        });

        it('should handle undefined/null values in currentUser', () => {
            const userWithNulls = {
                ...mockCurrentUser,
                firstName: null as any,
                lastName: undefined as any,
            } as UserModel;

            const userInfo = {
                ...baseUserInfo,
                firstName: 'Jane',
                lastName: 'Smith',
            };

            const result = buildUserInfoUpdates(userInfo, userWithNulls, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: 'Jane',
                last_name: 'Smith',
            });
        });

        it('should handle empty string changes', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: '',
                nickname: '',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toEqual({
                first_name: '',
                nickname: '',
            });
        });

        it('should handle missing fieldLockConfig keys', () => {
            const userInfo = {...baseUserInfo, firstName: 'Jane'};
            const partialLockConfig = {

                // Missing firstName key - should default to false (unlocked)
                lastName: false,
            } as any;

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, partialLockConfig);

            expect(result).toEqual({
                first_name: 'Jane',
            });
        });
    });

    describe('camelCase to snake_case conversion mapping', () => {
        it('should convert firstName to first_name', () => {
            const userInfo = {...baseUserInfo, firstName: 'NewName'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('first_name', 'NewName');
            expect(result).not.toHaveProperty('firstName');
        });

        it('should convert lastName to last_name', () => {
            const userInfo = {...baseUserInfo, lastName: 'NewLast'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('last_name', 'NewLast');
            expect(result).not.toHaveProperty('lastName');
        });

        it('should keep nickname as nickname (no conversion)', () => {
            const userInfo = {...baseUserInfo, nickname: 'NewNick'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('nickname', 'NewNick');
        });

        it('should keep position as position (no conversion)', () => {
            const userInfo = {...baseUserInfo, position: 'NewPosition'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('position', 'NewPosition');
        });

        it('should keep username as username (no conversion)', () => {
            const userInfo = {...baseUserInfo, username: 'newuser'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('username', 'newuser');
        });

        it('should keep email as email (no conversion)', () => {
            const userInfo = {...baseUserInfo, email: 'new@email.com'};
            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result).toHaveProperty('email', 'new@email.com');
        });
    });

    describe('Complex real-world scenarios', () => {
        it('should handle SAML user scenario with typical field locks', () => {
            const samlUser = {...mockCurrentUser, authService: 'saml'} as UserModel;
            const samlLockConfig = {
                email: true, // Always locked
                firstName: true, // SAML locked
                lastName: true, // SAML locked
                nickname: false, // Not locked for SAML
                position: false, // Not locked for SAML
                username: true, // Locked for external auth
            };

            const userInfo = {
                ...baseUserInfo,
                firstName: 'ChangedName', // Should be ignored (locked)
                lastName: 'ChangedLast', // Should be ignored (locked)
                nickname: 'NewNick', // Should be included
                position: 'New Position', // Should be included
            };

            const result = buildUserInfoUpdates(userInfo, samlUser, samlLockConfig);

            expect(result).toEqual({
                nickname: 'NewNick',
                position: 'New Position',
            });
        });

        it('should handle OAuth user scenario', () => {
            const oauthUser = {...mockCurrentUser, authService: 'gitlab'} as UserModel;
            const oauthLockConfig = {
                email: true,
                firstName: true, // OAuth typically locks these
                lastName: true,
                nickname: false,
                position: false,
                username: true, // External auth locks username
            };

            const userInfo = {
                ...baseUserInfo,
                firstName: 'NewFirst', // Locked
                lastName: 'NewLast', // Locked
                nickname: 'NewNick', // Unlocked
                position: 'New Pos', // Unlocked
                username: 'newuser', // Locked
            };

            const result = buildUserInfoUpdates(userInfo, oauthUser, oauthLockConfig);

            expect(result).toEqual({
                nickname: 'NewNick',
                position: 'New Pos',
            });
        });

        it('should handle mixed changes with trimming and locking', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: '  Jane  ', // Should be trimmed and included
                lastName: '  Doe  ', // Should be trimmed but excluded (same value)
                nickname: '  JD  ', // Should be trimmed and included
                position: 'Senior Dev', // Changed, but locked
                username: '  johndoe  ', // Trimmed to same value, should be excluded
            };

            const mixedConfig = {
                email: false,
                firstName: false,
                lastName: false,
                nickname: false,
                position: true, // locked
                username: false,
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, mixedConfig);

            expect(result).toEqual({
                first_name: 'Jane',
                nickname: 'JD',
            });
        });

        it('should handle performance scenario with all fields modified but various locks', () => {
            const userInfo = {
                email: 'totally-new@email.com',
                firstName: 'CompletlyNew',
                lastName: 'VeryDifferent',
                nickname: 'Brand New Nick',
                position: 'Chief Executive Officer',
                username: 'ceo_user',
                customAttributes: {},
            };

            const realisticLockConfig = {
                email: true, // Typically always locked
                firstName: false,
                lastName: false,
                nickname: false,
                position: false,
                username: true, // Often locked
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, realisticLockConfig);

            expect(result).toEqual({
                first_name: 'CompletlyNew',
                last_name: 'VeryDifferent',
                nickname: 'Brand New Nick',
                position: 'Chief Executive Officer',
            });

            // Verify locked fields not included
            expect(result).not.toHaveProperty('email');
            expect(result).not.toHaveProperty('username');
        });
    });

    describe('Function behavior validation', () => {
        it('should always return a new object (not mutate inputs)', () => {
            const userInfo = {...baseUserInfo, firstName: 'Jane'};
            const originalUserInfo = {...userInfo};
            const originalCurrentUser = {...mockCurrentUser};
            const originalLockConfig = {...unlockedFieldConfig};

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            // Verify inputs weren't mutated
            expect(userInfo).toEqual(originalUserInfo);
            expect(mockCurrentUser).toEqual(originalCurrentUser);
            expect(unlockedFieldConfig).toEqual(originalLockConfig);

            // Verify result is not the same reference
            expect(result).not.toBe(userInfo);
            expect(result).not.toBe(mockCurrentUser);
            expect(result).not.toBe(unlockedFieldConfig);
        });

        it('should handle the reduce accumulator properly', () => {
            const userInfo = {
                ...baseUserInfo,
                firstName: 'First',
                lastName: 'Last',
                position: 'Position',
            };

            const result = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            // Should accumulate all changes properly
            expect(Object.keys(result)).toHaveLength(3);
            expect(result).toEqual({
                first_name: 'First',
                last_name: 'Last',
                position: 'Position',
            });
        });

        it('should maintain consistent behavior across multiple calls', () => {
            const userInfo = {...baseUserInfo, firstName: 'Jane'};

            const result1 = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);
            const result2 = buildUserInfoUpdates(userInfo, mockCurrentUser, unlockedFieldConfig);

            expect(result1).toEqual(result2);
            expect(result1).not.toBe(result2); // Different object instances
        });
    });
});
