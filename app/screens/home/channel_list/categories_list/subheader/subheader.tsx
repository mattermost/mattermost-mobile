// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {HOME_PADDING} from '@constants/view';

import SearchField from './search_field';
import UnreadFilter from './unread_filter';

type Props = {
    unreadsOnTop: boolean;
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        ...HOME_PADDING,
    },
});

const SubHeader = ({unreadsOnTop}: Props) => {
    const showFilter = useSharedValue(!unreadsOnTop);

    const animatedStyle = useAnimatedStyle(() => ({
        marginRight: withTiming(showFilter.value ? 8 : 0, {duration: 300}),
        width: withTiming(showFilter.value ? 40 : 0, {duration: 300}),
        opacity: withTiming(showFilter.value ? 1 : 0, {duration: 300}),
    }));

    useEffect(() => {
        showFilter.value = !unreadsOnTop;
    }, [unreadsOnTop]);

    return (
        <View style={style.container}>
            <Animated.View style={animatedStyle}>
                <UnreadFilter/>
            </Animated.View>
            <SearchField/>
        </View>
    );
};

export default SubHeader;
