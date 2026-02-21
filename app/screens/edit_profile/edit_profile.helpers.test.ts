// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {buildUserInfoUpdates, getChangedCustomAttributes} from './edit_profile.helpers';

import type {CustomProfileFieldModel} from '@database/models/server';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';
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

describe('getChangedCustomAttributes', () => {
    // Mock data for testing
    const mockCustomFields: Array<Partial<CustomProfileFieldModel>> = [
        {
            id: 'field1',
            name: 'Department',
            type: 'text',
            attrs: {}, // Not SAML linked
        },
        {
            id: 'field2',
            name: 'Employee ID',
            type: 'text',
            attrs: {saml: 'employee_id'}, // SAML linked field
        },
        {
            id: 'field3',
            name: 'Location',
            type: 'text',
            attrs: {}, // Not SAML linked
        },
    ];

    const baseCustomAttributes = {
        attr1: {id: 'field1', name: 'Department', value: 'Engineering', type: 'text'},
        attr2: {id: 'field2', name: 'Employee ID', value: 'EMP123', type: 'text'},
        attr3: {id: 'field3', name: 'Location', value: 'San Francisco', type: 'text'},
    };

    const baseUserInfo: UserInfo = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        nickname: 'Johnny',
        position: 'Developer',
        username: 'johndoe',
        customAttributes: baseCustomAttributes,
    };

    const baseCustomAttributesSet: CustomAttributeSet = {
        attr1: {id: 'field1', name: 'Department', value: 'Engineering', type: 'text'},
        attr2: {id: 'field2', name: 'Employee ID', value: 'EMP123', type: 'text'},
        attr3: {id: 'field3', name: 'Location', value: 'San Francisco', type: 'text'},
    };

    describe('Feature disabled scenarios', () => {
        it('should return empty object when custom attributes are disabled', () => {
            const result = getChangedCustomAttributes(
                baseUserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                false, // disabled
            );

            expect(result).toEqual({});
        });

        it('should return empty object when userInfo has no custom attributes', () => {
            const userInfoWithoutAttrs = {
                ...baseUserInfo,
                customAttributes: undefined,
            };
            const result = getChangedCustomAttributes(
                userInfoWithoutAttrs as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({});
        });

        it('should return empty object when userInfo.customAttributes is null', () => {
            const userInfoWithNullAttrs = {
                ...baseUserInfo,
                customAttributes: null as any,
            };

            const result = getChangedCustomAttributes(
                userInfoWithNullAttrs,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({});
        });
    });

    describe('No changes scenarios', () => {
        it('should return empty object when no attributes have changed', () => {
            const result = getChangedCustomAttributes(
                baseUserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({});
        });

        it('should return empty object when current attributes set is undefined but new values are empty', () => {
            const userInfoWithEmptyValues = {
                ...baseUserInfo,
                customAttributes: {
                    attr1: {id: 'field1', value: ''},
                    attr2: {id: 'field2', value: ''},
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithEmptyValues as unknown as UserInfo,
                undefined, // No current attributes
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({});
        });

        it('should exclude attributes that have same value after trimming', () => {
            const userInfoWithSameValues = {
                ...baseUserInfo,
                customAttributes: {
                    attr1: {id: 'field1', value: 'Engineering'}, // Same value
                    attr2: {id: 'field2', value: 'EMP123'}, // Same value
                    attr3: {id: 'field3', value: 'San Francisco'}, // Same value
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithSameValues as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({});
        });
    });

    describe('Single attribute changes', () => {
        it('should detect single non-SAML attribute change', () => {
            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'}, // Changed from Engineering
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'Marketing'},
            });
        });

        it('should detect change from empty string to non-empty value', () => {
            const currentAttrsWithEmpty: CustomAttributeSet = {
                ...baseCustomAttributesSet,
                attr1: {id: 'field1', name: 'Department', value: '', type: 'text'}, // Empty current value
            };

            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'New Department'}, // Changed to non-empty
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                currentAttrsWithEmpty,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'New Department'},
            });
        });

        it('should detect change from non-empty to empty value', () => {
            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr3: {id: 'field3', value: ''}, // Changed to empty
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr3: {id: 'field3', value: ''},
            });
        });
    });

    describe('Multiple attribute changes', () => {
        it('should detect multiple non-SAML attribute changes', () => {
            const userInfoWithChanges = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'}, // Changed
                    attr2: {id: 'field2', value: 'EMP123'}, // Same (but SAML linked anyway)
                    attr3: {id: 'field3', value: 'New York'}, // Changed
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChanges as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'Marketing'},
                attr3: {id: 'field3', value: 'New York'},
            });
        });

        it('should handle mix of changed and unchanged attributes', () => {
            const userInfoWithMixedChanges = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Engineering'}, // Same - should be excluded
                    attr2: {id: 'field2', value: 'EMP456'}, // Changed but SAML linked - should be excluded
                    attr3: {id: 'field3', value: 'Los Angeles'}, // Changed - should be included
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithMixedChanges as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr3: {id: 'field3', value: 'Los Angeles'},
            });
        });
    });

    describe('SAML linked field behavior', () => {
        it('should exclude SAML linked fields even if they changed', () => {
            const userInfoWithSamlChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr2: {id: 'field2', value: 'EMP999'}, // Changed but SAML linked
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithSamlChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({}); // SAML linked field should be excluded
        });

        it('should include only non-SAML linked changes in mixed scenario', () => {
            const userInfoWithMixedSamlChanges = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'HR'}, // Changed, not SAML linked - include
                    attr2: {id: 'field2', value: 'EMP999'}, // Changed, SAML linked - exclude
                    attr3: {id: 'field3', value: 'Chicago'}, // Changed, not SAML linked - include
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithMixedSamlChanges as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'HR'},
                attr3: {id: 'field3', value: 'Chicago'},
            });
        });

        it('should handle missing custom field definition (treat as non-SAML linked)', () => {
            const userInfoWithUnknownField = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr4: {id: 'field4', value: 'Unknown Field Value'}, // Field not in customFields array
                },
            };

            const currentAttrsWithUnknown: CustomAttributeSet = {
                ...baseCustomAttributesSet,
                attr4: {id: 'field4', name: 'Unknown Field', value: 'Old Value', type: 'text'},
            };

            const result = getChangedCustomAttributes(
                userInfoWithUnknownField as unknown as UserInfo,
                currentAttrsWithUnknown,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr4: {id: 'field4', value: 'Unknown Field Value'},
            });
        });
    });

    describe('Edge cases and undefined/null handling', () => {
        it('should handle undefined customAttributesSetParam', () => {
            const userInfoWithNewAttrs = {
                ...baseUserInfo,
                customAttributes: {
                    attr1: {id: 'field1', value: 'Marketing'}, // New value vs undefined current
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithNewAttrs as unknown as UserInfo,
                undefined, // No current attributes
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'Marketing'},
            });
        });

        it('should handle undefined customFieldsParam', () => {
            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'},
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                undefined, // No custom fields definition
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'Marketing'},
            });
        });

        it('should handle empty customFieldsParam array', () => {
            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'},
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                [], // Empty array
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'Marketing'},
            });
        });

        it('should handle undefined values in custom attributes', () => {
            const userInfoWithUndefinedValue = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: undefined as any}, // Undefined value
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithUndefinedValue as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: undefined},
            });
        });

        it('should handle null values in custom attributes', () => {
            const userInfoWithNullValue = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: null as any}, // Null value
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithNullValue as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: null},
            });
        });

        it('should handle missing attributes in current set', () => {
            const userInfoWithNewAttr = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr4: {id: 'field4', value: 'Brand New Attribute'}, // Not in current set
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithNewAttr as unknown as UserInfo,
                baseCustomAttributesSet, // Doesn't contain attr4
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr4: {id: 'field4', value: 'Brand New Attribute'},
            });
        });

        it('should handle missing id in custom attribute', () => {
            const userInfoWithMissingId = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: undefined as any, value: 'Marketing'}, // Missing id
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithMissingId as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: undefined, value: 'Marketing'},
            });
        });
    });

    describe('Value comparison edge cases', () => {
        it('should treat empty string and undefined as same (both normalize to empty string)', () => {
            const currentAttrsWithEmpty: CustomAttributeSet = {
                ...baseCustomAttributesSet,
                attr1: {id: 'field1', name: 'Department', value: '', type: 'text'}, // Empty string
            };

            const userInfoWithUndefined = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', name: 'Department', value: undefined as any, type: 'text'}, // undefined
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithUndefined as unknown as UserInfo,
                currentAttrsWithEmpty,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({}); // No change detected since both normalize to ''
        });

        it('should handle null vs empty string as same (both normalize to empty string)', () => {
            const currentAttrsWithNull: CustomAttributeSet = {
                ...baseCustomAttributesSet,
                attr1: {id: 'field1', name: 'Department', value: null as any, type: 'text'}, // null
            };

            const userInfoWithEmpty = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', name: 'Department', value: '', type: 'text'}, // empty string
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithEmpty as unknown as UserInfo,
                currentAttrsWithNull,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({}); // No change detected since both normalize to ''
        });

        it('should handle case sensitivity in value comparison', () => {
            const userInfoWithDifferentCase = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'engineering'}, // Different case
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithDifferentCase as unknown as UserInfo,
                baseCustomAttributesSet, // Contains 'Engineering'
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                attr1: {id: 'field1', value: 'engineering'},
            });
        });
    });

    describe('Performance and behavior validation', () => {
        it('should not mutate input parameters', () => {
            const originalUserInfo = JSON.parse(JSON.stringify(baseUserInfo));
            const originalCustomAttrsSet = JSON.parse(JSON.stringify(baseCustomAttributesSet));
            const originalCustomFields = [...mockCustomFields];

            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'},
                },
            };

            getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            // Verify no mutation occurred
            expect(baseUserInfo).toEqual(originalUserInfo);
            expect(baseCustomAttributesSet).toEqual(originalCustomAttrsSet);
            expect(mockCustomFields).toEqual(originalCustomFields);
        });

        it('should return consistent results across multiple calls', () => {
            const userInfoWithChange = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'Marketing'},
                    attr3: {id: 'field3', value: 'Seattle'},
                },
            };

            const result1 = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            const result2 = getChangedCustomAttributes(
                userInfoWithChange as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result1).toEqual(result2);
            expect(result1).not.toBe(result2); // Different object instances
        });

        it('should handle large number of attributes efficiently', () => {
            const manyCustomFields: any[] = Array.from({length: 100}, (_, i) => ({
                id: `field${i}`,
                name: `Field ${i}`,
                type: 'text',
                attrs: i % 3 === 0 ? {saml: `field${i}`} : {}, // Every third field is SAML linked
            }));

            const manyCustomAttributes = Object.fromEntries(
                Array.from({length: 100}, (_, i) => [`attr${i}`, {id: `field${i}`, value: `value${i}`}]),
            );

            const manyCurrentAttrs: CustomAttributeSet = Object.fromEntries(
                Array.from({length: 100}, (_, i) => [`attr${i}`, {id: `field${i}`, name: `Field ${i}`, type: 'text', value: `value${i}`}]),
            );

            const userInfoWithManyChanges = {
                ...baseUserInfo,
                customAttributes: {
                    ...manyCustomAttributes,
                    attr0: {id: 'field0', value: 'changed0'}, // Changed, SAML linked (0 % 3 = 0)
                    attr1: {id: 'field1', value: 'changed1'}, // Changed, not SAML linked (1 % 3 = 1)
                    attr3: {id: 'field3', value: 'changed3'}, // Changed, SAML linked (3 % 3 = 0)
                    attr5: {id: 'field5', value: 'changed5'}, // Changed, not SAML linked (5 % 3 = 2)
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithManyChanges as unknown as UserInfo,
                manyCurrentAttrs,
                manyCustomFields as CustomProfileFieldModel[],
                true,
            );

            // Only non-SAML linked changes should be included
            expect(result).toEqual({
                attr1: {id: 'field1', value: 'changed1'},
                attr5: {id: 'field5', value: 'changed5'},
            });
        });

        it('should properly use reduce accumulator pattern', () => {
            const userInfoWithMultipleChanges = {
                ...baseUserInfo,
                customAttributes: {
                    ...baseCustomAttributes,
                    attr1: {id: 'field1', value: 'HR'},
                    attr3: {id: 'field3', value: 'Miami'},
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithMultipleChanges as unknown as UserInfo,
                baseCustomAttributesSet,
                mockCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(Object.keys(result)).toHaveLength(2);
            expect(result).toEqual({
                attr1: {id: 'field1', value: 'HR'},
                attr3: {id: 'field3', value: 'Miami'},
            });
        });
    });

    describe('Real-world integration scenarios', () => {
        it('should handle typical user profile update flow', () => {
            const currentUserAttrs: CustomAttributeSet = {
                department: {id: 'dept_field', name: 'Department', value: 'Engineering', type: 'text'},
                location: {id: 'loc_field', name: 'Location', value: 'San Francisco', type: 'text'},
                employee_id: {id: 'emp_field', name: 'Employee ID', value: 'EMP001', type: 'text'}, // SAML linked
                start_date: {id: 'date_field', name: 'Start Date', value: '2020-01-01', type: 'text'},
            };

            const customFields: any[] = [
                {id: 'dept_field', name: 'Department', type: 'text', attrs: {}},
                {id: 'loc_field', name: 'Location', type: 'text', attrs: {}},
                {id: 'emp_field', name: 'Employee ID', type: 'text', attrs: {saml: 'emp_id'}},
                {id: 'date_field', name: 'Start Date', type: 'text', attrs: {}},
            ];

            const userInfoWithUpdates = {
                ...baseUserInfo,
                customAttributes: {
                    department: {id: 'dept_field', value: 'Marketing'}, // Changed
                    location: {id: 'loc_field', value: 'San Francisco'}, // Same
                    employee_id: {id: 'emp_field', value: 'EMP999'}, // Changed but SAML linked
                    start_date: {id: 'date_field', value: '2020-01-15'}, // Changed
                },
            };

            const result = getChangedCustomAttributes(
                userInfoWithUpdates as unknown as UserInfo,
                currentUserAttrs,
                customFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                department: {id: 'dept_field', value: 'Marketing'},
                start_date: {id: 'date_field', value: '2020-01-15'},
            });
        });

        it('should handle SAML user with mixed field restrictions', () => {
            const samlCustomFields: any[] = [
                {id: 'dept', name: 'Department', type: 'text', attrs: {saml: 'department'}},
                {id: 'loc', name: 'Location', type: 'text', attrs: {saml: 'location'}},
                {id: 'phone', name: 'Phone', type: 'text', attrs: {}},
                {id: 'notes', name: 'Notes', type: 'text', attrs: {}},
            ];

            const currentSamlAttrs: CustomAttributeSet = {
                department: {id: 'dept', name: 'Department', value: 'IT', type: 'text'},
                location: {id: 'loc', name: 'Location', value: 'Boston', type: 'text'},
                phone: {id: 'phone', name: 'Phone', value: '555-0123', type: 'text'},
                notes: {id: 'notes', name: 'Notes', value: 'No notes', type: 'text'},
            };

            const userInfoSamlUpdates = {
                ...baseUserInfo,
                customAttributes: {
                    department: {id: 'dept', value: 'Security'}, // SAML linked - should be ignored
                    location: {id: 'loc', value: 'Austin'}, // SAML linked - should be ignored
                    phone: {id: 'phone', value: '555-9999'}, // Not SAML linked - should be included
                    notes: {id: 'notes', value: 'Updated notes'}, // Not SAML linked - should be included
                },
            };

            const result = getChangedCustomAttributes(
                userInfoSamlUpdates as unknown as UserInfo,
                currentSamlAttrs,
                samlCustomFields as CustomProfileFieldModel[],
                true,
            );

            expect(result).toEqual({
                phone: {id: 'phone', value: '555-9999'},
                notes: {id: 'notes', value: 'Updated notes'},
            });
        });
    });
});
