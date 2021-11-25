// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ProfilePicture from '@components/profile_picture/image';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        containerStyle: {
            width: 120,
            height: 120,
            borderRadius: 60,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.58),
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
            <ProfilePicture
                containerStyle={styles.containerStyle}
                isBot={user.isBot}
                lastPictureUpdate={user.lastPictureUpdate}
                size={120}
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
