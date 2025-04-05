// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useRef} from 'react';
import {FlatList} from 'react-native-gesture-handler';

import {useIsTablet} from '@hooks/device';

import UserListItem from './user_list_item';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {ListRenderItemInfo} from 'react-native';

type Props = {
    channelId: string;
    location: AvailableScreens;
    users: UserModel[];
    userAcknowledgements: Record<string, number>;
    timezone?: UserTimezone;
};

const UsersList = ({channelId, location, users, userAcknowledgements, timezone}: Props) => {
    const isTablet = useIsTablet();
    const listRef = useRef<FlatList>(null);

    const renderItem = useCallback(({item}: ListRenderItemInfo<UserModel>) => (
        <UserListItem
            channelId={channelId}
            location={location}
            user={item}
            userAcknowledgement={userAcknowledgements[item.id]}
            timezone={timezone}
        />
    ), [channelId, location, timezone]);

    if (isTablet) {
        return (
            <FlatList
                data={users}
                ref={listRef}
                renderItem={renderItem}
                overScrollMode={'always'}
            />
        );
    }

    return (
        <BottomSheetFlatList
            data={users}
            renderItem={renderItem}
            overScrollMode={'always'}
        />
    );
};

export default UsersList;
