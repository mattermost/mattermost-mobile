// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import UserItem from '@components/user_item';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user: UserProfile | UserModel;
    onPress?: (username: string) => void;
    testID?: string;
}

const AtMentionItem = ({
    user,
    onPress,
    testID,
}: AtMentionItemProps) => {
    const completeMention = useCallback((u: UserModel | UserProfile) => {
        onPress?.(u.username);
    }, []);

    return (
        <UserItem
            user={user}
            testID={testID}
            onUserPress={completeMention}
        />
    );
};

export default AtMentionItem;
