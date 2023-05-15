// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {FlatList} from 'react-native-gesture-handler';

import UserListItem from './user_list_item';

import type UserModel from '@typings/database/models/servers/user';
import type {ListRenderItemInfo} from 'react-native';

type Props = {
    channelId: string;
    location: string;
    users: UserModel[];
    userAcknowledgements: Record<string, number>;
    timezone?: UserTimezone;
};

const UsersList = ({channelId, location, users, userAcknowledgements, timezone}: Props) => {
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

    return (
        <FlatList
            data={users}
            ref={listRef}
            renderItem={renderItem}
            overScrollMode={'always'}
        />
    );
};

export default UsersList;
