// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {fetchUsersByIds} from '@actions/remote/user';
import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {openUserProfileModal} from '@screens/navigation';

import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    location: AvailableScreens;
    reaction: ReactionModel;
    user?: UserModel;
}

const Reactor = ({channelId, location, reaction, user}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const openUserProfile = async () => {
        if (user) {
            openUserProfileModal(intl, theme, {
                userId: user.id,
                channelId,
                location,
            }, Screens.REACTIONS);
        }
    };

    useEffect(() => {
        if (!user) {
            fetchUsersByIds(serverUrl, [reaction.userId]);
        }
    }, []);

    return (
        <UserItem
            user={user}
            testID='reactions.reactor_item'
            onUserPress={openUserProfile}
        />
    );
};

export default Reactor;
