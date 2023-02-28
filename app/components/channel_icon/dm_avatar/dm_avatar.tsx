// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    onCenterBg?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {marginLeft: 4},
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

const DmAvatar = ({author, onCenterBg}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    if (author?.deleteAt) {
        return (
            <CompassIcon
                name='archive-outline'
                style={[style.icon, onCenterBg && style.iconOnCenterBg]}
                size={24}
            />
        );
    }

    return (
        <ProfilePicture
            author={author}
            size={24}
            showStatus={true}
            statusSize={12}
            statusStyle={[style.status, onCenterBg && style.statusOnCenterBg]}
        />
    );
};

export default DmAvatar;
