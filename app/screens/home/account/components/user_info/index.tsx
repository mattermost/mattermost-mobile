// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {isPlatformUiIos} from '@constants/platform_ui';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    user: UserModel;
    showFullName: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const platformUi = isPlatformUiIos();
    const surface = platformUi ? theme.centerChannelBg : theme.sidebarBg;
    const textColor = platformUi ? theme.centerChannelColor : theme.sidebarText;

    return {
        container: {
            backgroundColor: surface,
            paddingBottom: 20,
            top: 0,
            paddingTop: 22,
            paddingLeft: 20,
        },
        statusStyle: {
            right: 10,
            bottom: 10,
            borderColor: surface,
            backgroundColor: surface,
        },
        textFullName: {
            fontSize: 28,
            lineHeight: 36,
            color: textColor,
            fontFamily: 'Metropolis-SemiBold',
            marginTop: 16,
        },
        textUserName: {
            fontSize: 16,
            lineHeight: 24,
            color: textColor,
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
    const accountUserInfoTestId = `account.user_info.${user.id}`;

    return (
        <View style={styles.container}>
            <ProfilePicture
                size={120}
                iconSize={28}
                showStatus={true}
                author={user}
                statusStyle={styles.statusStyle}
                statusSize={24}
                testID={`${accountUserInfoTestId}.profile_picture`}
            />
            {showFullName &&
            <Text
                style={styles.textFullName}
                testID={`${accountUserInfoTestId}.display_name`}
            >
                {title}
            </Text>
            }
            <Text
                style={showFullName ? styles.textUserName : styles.textFullName}
                testID={`${accountUserInfoTestId}.username`}
            >
                {`${userName}`}
            </Text>
        </View>
    );
};

export default AccountUserInfo;
