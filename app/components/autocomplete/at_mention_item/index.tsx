// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import UserItem from '@components/user_item';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

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
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    const completeMention = useCallback(() => {
        onPress?.(user.username);
    }, [user.username]);

    return (
        <TouchableWithFeedback
            key={user.id}
            onPress={completeMention}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            style={{marginLeft: insets.left, marginRight: insets.right}}
            type={'native'}
        >
            <UserItem
                user={user}
                testID={testID}
            />
        </TouchableWithFeedback>
    );
};

export default AtMentionItem;
