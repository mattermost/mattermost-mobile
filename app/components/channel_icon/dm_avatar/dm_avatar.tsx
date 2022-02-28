// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    status: {
        backgroundColor: theme.sidebarBg,
        borderWidth: 0,
    },
}));

const DmAvatar = ({author}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    return (
        <ProfilePicture
            author={author}
            size={24}
            showStatus={true}
            statusSize={12}
            statusStyle={style.status}
        />
    );
};

export default DmAvatar;
