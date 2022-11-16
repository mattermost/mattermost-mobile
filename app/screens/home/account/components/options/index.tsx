// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CustomStatus from './custom_status';
import Logout from './logout';
import Settings from './settings';
import UserPresence from './user_presence';
import YourProfile from './your_profile';

import type UserModel from '@typings/database/models/servers/user';

type AccountScreenProps = {
    user: UserModel;
    enableCustomUserStatuses: boolean;
    isTablet: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            height: '100%',
            borderTopRightRadius: 12,
            borderTopLeftRadius: 12,
            paddingTop: 12,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
            shadowOffset: {width: 0, height: -2},
            shadowOpacity: 1,
            shadowRadius: 6,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
            width: '90%',
            alignSelf: 'center',
            marginVertical: 8,
        },
        group: {
            paddingLeft: 16,
        },
    };
});

const AccountOptions = ({user, enableCustomUserStatuses, isTablet, theme}: AccountScreenProps) => {
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <View style={styles.group}>
                <UserPresence
                    currentUser={user}
                />
                {enableCustomUserStatuses &&
                <CustomStatus
                    isTablet={isTablet}
                    currentUser={user}
                />}
            </View>
            <View style={styles.divider}/>
            <View style={styles.group}>
                <YourProfile
                    isTablet={isTablet}
                    theme={theme}
                />
                <Settings/>
            </View>
            <View style={styles.divider}/>
            <View style={styles.group}>
                <Logout/>
            </View>
        </View>
    );
};

export default AccountOptions;
