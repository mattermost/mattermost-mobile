// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent, PanResponder} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    location: string;
    type?: BottomSheetList;
    users: UserModel[];
};

type ItemProps = {
    channelId: string;
    location: string;
    user: UserModel;
}

const Item = ({channelId, location, user}: ItemProps) => {
    const intl = useIntl();
    const theme = useTheme();

    const openUserProfile = useCallback(async (u: UserModel | UserProfile) => {
        await dismissBottomSheet(Screens.BOTTOM_SHEET);
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {closeButtonId, location, userId: u.id, channelId};

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }, [location, channelId, theme, intl]);

    return (
        <UserItem
            user={user}
            onUserPress={openUserProfile}
        />
    );
};

const UsersList = ({channelId, location, type = 'FlatList', users}: Props) => {
    const [enabled, setEnabled] = useState(type === 'BottomSheetFlatList');
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
        <Item
            channelId={channelId}
            location={location}
            user={item}
        />
    ), [channelId, location]);

    if (type === 'BottomSheetFlatList') {
        return (
            <BottomSheetFlatList
                data={users}
                renderItem={renderItem}
                overScrollMode={'always'}
            />
        );
    }

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
