// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';
import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
    author?: UserModel;
    isOnCenterBg?: boolean;
    style: StyleProp<ViewStyle>;
    size: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    status: {
        backgroundColor: theme.sidebarBg,
        borderWidth: 0,
    },
    statusOnCenterBg: {
        backgroundColor: theme.centerChannelBg,
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.4),
        left: 1,
    },
    iconOnCenterBg: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
}));

const DmAvatar = ({author, isOnCenterBg, style, size}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (author?.deleteAt) {
        return (
            <CompassIcon
                name='archive-outline'
                style={[styles.icon, style, isOnCenterBg && styles.iconOnCenterBg]}
                size={24}
            />
        );
    }

    return (
        <ProfilePicture
            author={author}
            size={size}
            showStatus={true}
            statusSize={12}
            statusStyle={[styles.status, isOnCenterBg && styles.statusOnCenterBg]}
            containerStyle={style}
        />
    );
};

export default DmAvatar;
