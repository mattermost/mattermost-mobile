// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import UserItem from '@components/user_item';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user: UserProfile | UserModel;
    onPress?: (username: string) => void;
    testID?: string;
    enableMentionConversion?: boolean;
}

const AtMentionItem = ({
    user,
    onPress,
    testID,
    enableMentionConversion,
}: AtMentionItemProps) => {
    const completeMention = useCallback((u: UserModel | UserProfile) => {
        if (enableMentionConversion) {
            // フルネームが利用可能な場合はフルネームを使用
            let fullName: string;
            if ('firstName' in u && 'lastName' in u) {
                if (u.firstName && u.lastName) {
                    fullName = `${u.firstName} ${u.lastName}`;
                } else {
                    fullName = u.firstName || u.lastName || u.username;
                }
            } else if (u.first_name && u.last_name) {
                fullName = `${u.first_name} ${u.last_name}`;
            } else {
                fullName = u.first_name || u.last_name || u.username;
            }

            if (fullName && fullName.trim() && fullName !== u.username) {
                onPress?.(fullName);
                return;
            }
        }
        onPress?.(u.username);
    }, [onPress, enableMentionConversion]);

    return (
        <UserItem
            user={user}
            testID={testID}
            onUserPress={completeMention}
        />
    );
};

export default AtMentionItem;
