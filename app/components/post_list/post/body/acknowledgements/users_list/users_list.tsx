// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, PanResponder} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import UserListItem from './user_list_item';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    location: string;
    users: UserModel[];
    userAcknowledgements: Record<string, number>;
};

const UsersList = ({channelId, location, users, userAcknowledgements}: Props) => {
    const [enabled, setEnabled] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const listRef = useRef<FlatList>(null);
    const prevOffset = useRef(0);
    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, g) => {
            const dir = prevOffset.current < g.dy ? 'down' : 'up';
            prevOffset.current = g.dy;
            if (!enabled && dir === 'up') {
                setEnabled(true);
            }
            setDirection(dir);
            return false;
        },
    })).current;

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.nativeEvent.contentOffset.y <= 0 && enabled && direction === 'down') {
            setEnabled(false);
            listRef.current?.scrollToOffset({animated: true, offset: 0});
        }
    }, [enabled, direction]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<UserModel>) => (
        <UserListItem
            channelId={channelId}
            location={location}
            user={item}
            userAcknowledgement={userAcknowledgements[item.id]}
        />
    ), [channelId, location, userAcknowledgements]);

    return (
        <FlatList
            data={users}
            ref={listRef}
            renderItem={renderItem}
            onScroll={onScroll}
            overScrollMode={'always'}
            scrollEnabled={enabled}
            scrollEventThrottle={60}
            {...panResponder.panHandlers}
        />
    );
};

export default UsersList;
