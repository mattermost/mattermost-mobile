// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import {type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {openUserProfileModal} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId?: string;
    location: AvailableScreens;
    type?: BottomSheetList;
    users: UserModel[];
};

type ItemProps = {
    channelId?: string;
    location: AvailableScreens;
    user: UserModel;
}

const Item = ({channelId, location, user}: ItemProps) => {
    const intl = useIntl();
    const theme = useTheme();

    const openUserProfile = useCallback(async (u: UserModel | UserProfile) => {
        openUserProfileModal(intl, theme, {
            userId: u.id,
            channelId,
            location,
        }, Screens.BOTTOM_SHEET);
    }, [location, channelId, theme, intl]);

    return (
        <UserItem
            user={user}
            onUserPress={openUserProfile}
        />
    );
};

const UsersList = ({channelId, location, type = 'FlatList', users}: Props) => {
    const listRef = useRef<FlatList>(null);
    const {direction, enabled, panResponder, setEnabled} = useBottomSheetListsFix();

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.nativeEvent.contentOffset.y <= 0 && enabled && direction === 'down') {
            setEnabled(false);
            listRef.current?.scrollToOffset({animated: true, offset: 0});
        }
    }, [enabled, direction, setEnabled]);

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
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
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
