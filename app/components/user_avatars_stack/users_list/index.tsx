// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useBottomSheetScrollableCreator} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {type ListRenderItemInfo, FlatList} from 'react-native';

import UserItem from '@components/user_item';
import {dismissBottomSheet} from '@screens/navigation';
import {openUserProfile} from '@utils/navigation';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId?: string;
    location: AvailableScreens;
    users: UserModel[];
};

type ItemProps = {
    channelId?: string;
    location: AvailableScreens;
    user: UserModel;
}

const Item = ({channelId, location, user}: ItemProps) => {
    const openProfile = useCallback(async (u: UserModel | UserProfile) => {
        await dismissBottomSheet();
        openUserProfile({
            userId: u.id,
            channelId,
            location,
        });
    }, [location, channelId]);

    return (
        <UserItem
            user={user}
            onUserPress={openProfile}
        />
    );
};

const UsersList = ({channelId, location, users}: Props) => {
    const BottomSheetScrollableCreator = useBottomSheetScrollableCreator();

    const renderItem = useCallback(({item}: ListRenderItemInfo<UserModel>) => (
        <Item
            channelId={channelId}
            location={location}
            user={item}
        />
    ), [channelId, location]);

    return (
        <FlatList
            data={users}
            renderItem={renderItem}
            overScrollMode={'always'}
            renderScrollComponent={BottomSheetScrollableCreator}
        />
    );
};

export default UsersList;
