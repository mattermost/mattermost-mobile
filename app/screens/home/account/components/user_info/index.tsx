// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ProfilePictureWithStatus from '@components/user_profile_picture/with_status_indicator';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    user: UserModel;
    showFullName: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.sidebarBg,
            paddingBottom: 20,
            top: 0,
            paddingTop: 22,
            paddingLeft: 20,
        },
        statusStyle: {
            borderColor: theme.sidebarBg,
            backgroundColor: theme.sidebarBg,
        },
        textFullName: {
            fontSize: 28,
            lineHeight: 36,
            color: theme.sidebarText,
            fontFamily: 'Metropolis-SemiBold',
            marginTop: 16,
        },
        textUserName: {
            fontSize: 16,
            lineHeight: 24,
            color: theme.sidebarText,
            fontFamily: 'OpenSans',
            marginTop: 4,
        },
    };
});

const AccountUserInfo = ({user, showFullName, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const nickName = user.nickname ? ` (${user.nickname})` : '';
    const title = `${user.firstName} ${user.lastName}${nickName}`;
    const userName = `@${user.username}`;

    return (
        <View style={styles.container}>
            <ProfilePictureWithStatus
                isBot={user.isBot}
                lastPictureUpdate={user.lastPictureUpdate}
                statusSize={34}
                statusStyle={styles.statusStyle}
                testID={'account.profile_picture'}
                userId={user.id}
                userStatus={user.status}
            />
            {showFullName && <Text style={styles.textFullName}>{title}</Text>}
            <Text style={showFullName ? styles.textUserName : styles.textFullName}>{`${userName}`}</Text>
        </View>
    );
};

export default AccountUserInfo;
