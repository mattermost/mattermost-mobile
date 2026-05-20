// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fetchUsersByIds} from '@actions/remote/user';
import UserItem from '@components/user_item';
import {useServerUrl} from '@context/server';
import useDidMount from '@hooks/did_mount';
import {dismissBottomSheet} from '@screens/navigation';
import {openUserProfile} from '@utils/navigation';

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
    const openProfile = async () => {
        if (user) {
            await dismissBottomSheet();
            openUserProfile({
                userId: user.id,
                channelId,
                location,
            });
        }
    };

    useDidMount(() => {
        if (!user) {
            fetchUsersByIds(serverUrl, [reaction.userId]);
        }
    });

    return (
        <UserItem
            user={user}
            testID='reactions.reactor_item'
            onUserPress={openProfile}
        />
    );
};

export default Reactor;
