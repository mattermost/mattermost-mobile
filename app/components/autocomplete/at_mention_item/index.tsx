// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import UserItem from '@components/user_item';
import {getFullName} from '@utils/user';

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
            const displayName = getFullName(u) || u.username;
            if (displayName !== u.username) {
                onPress?.(displayName);
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
