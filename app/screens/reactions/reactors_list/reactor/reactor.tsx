// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    location: string;
    user: UserModel;
}

const Reactor = ({channelId, location, user}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const openUserProfile = async () => {
        if (user) {
            await dismissBottomSheet(Screens.REACTIONS);
            const screen = Screens.USER_PROFILE;
            const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
            const closeButtonId = 'close-user-profile';
            const props = {closeButtonId, location, userId: user.id, channelId};

            Keyboard.dismiss();
            openAsBottomSheet({screen, title, theme, closeButtonId, props});
        }
    };

    return (
        <UserItem
            user={user}
            testID='reactions.reactor_item'
            onUserPress={openUserProfile}
        />
    );
};

export default Reactor;
