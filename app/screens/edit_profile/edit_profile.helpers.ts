// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isCustomFieldSamlLinked} from '@utils/user';

import type {CustomProfileFieldModel} from '@database/models/server';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';
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

export function getChangedCustomAttributes(
    userInfoParam: UserInfo,
    customAttributesSetParam: CustomAttributeSet | undefined,
    customFieldsParam: CustomProfileFieldModel[] | undefined,
    enableCustomAttributes: boolean,
): CustomAttributeSet {
    if (!userInfoParam.customAttributes || !enableCustomAttributes) {
        return {};
    }

    const customFieldsMap = new Map<string, CustomProfileFieldModel>();
    customFieldsParam?.forEach((field) => {
        customFieldsMap.set(field.id, field);
    });

    return Object.keys(userInfoParam.customAttributes).reduce<CustomAttributeSet>((changedCustomAttributes, key) => {
        const currentValue = customAttributesSetParam?.[key]?.value ?? '';
        const newValue = userInfoParam.customAttributes[key]?.value ?? '';
        const customAttribute = userInfoParam.customAttributes[key];
        const customField = customFieldsMap.get(customAttribute?.id);

        if (currentValue !== newValue && !isCustomFieldSamlLinked(customField)) {
            changedCustomAttributes[key] = userInfoParam.customAttributes[key];
        }

        return changedCustomAttributes;
    }, {});
}
