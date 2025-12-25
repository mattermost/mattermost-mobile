// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';

import {fetchUsersByIds} from '@actions/remote/user';
import UserItem from '@components/user_item';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet, openUserProfileModal} from '@utils/navigation/adapter';

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
    const serverUrl = useServerUrl();
    const openUserProfile = async () => {
        if (user) {
            await dismissBottomSheet();
            openUserProfileModal({
                userId: user.id,
                channelId,
                location,
            });
        }
    };

    useEffect(() => {
        if (!user) {
            fetchUsersByIds(serverUrl, [reaction.userId]);
        }

    // Only needed on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
