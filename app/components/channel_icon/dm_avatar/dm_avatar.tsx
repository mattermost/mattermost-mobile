// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    isInfo?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginLeft: 4},
    status: {
        backgroundColor: theme.sidebarBg,
        borderWidth: 0,
    },
    statusInfo: {
        backgroundColor: theme.centerChannelBg,
    },
}));

const DmAvatar = ({author, isInfo}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    return (
        <View style={style.container}>
            <ProfilePicture
                author={author}
                size={24}
                showStatus={true}
                statusSize={12}
                statusStyle={[style.status, isInfo && style.statusInfo]}
            />
        </View>
    );
};

export default DmAvatar;
