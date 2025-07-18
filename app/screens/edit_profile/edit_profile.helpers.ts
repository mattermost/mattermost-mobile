// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';
import type {UserInfo} from '@typings/screens/edit_profile';

// Convert camelCase properties to snake_case for API compatibility
const keyMapping: Record<string, keyof UserProfile> = {
    firstName: 'first_name',
    lastName: 'last_name',
    nickname: 'nickname',
    position: 'position',
    username: 'username',
    email: 'email',
};

// Utility function for user profile updates
export function buildUserInfoUpdates(
    userInfo: UserInfo,
    currentUser: UserModel,
    fieldLockConfig: Record<string, boolean>,
): Partial<UserProfile> {
    // Check each mappable field for changes and build updates object
    return Object.entries(keyMapping).reduce((acc, [camelKey, snakeKey]) => {
        const isLocked = fieldLockConfig[camelKey] || false;
        const newValue = (userInfo[camelKey as keyof UserInfo] as string)?.trim() || '';
        const oldValue = (currentUser[camelKey as keyof UserModel] as string) || '';

        if (!isLocked && newValue !== oldValue) {
            (acc as any)[snakeKey] = newValue;
        }

        return acc;
    }, {} as Partial<UserProfile>);
}
