// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React from 'react';
import {Text} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

const SearchScreen = () => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    return (
        <SafeAreaView
            style={{flex: 1, backgroundColor: 'blue'}}
        >
            <Animated.View
                style={[{flex: 1, justifyContent: 'center', alignItems: 'center'}, animated]}
            >
                {isFocused &&
                    <Text style={{fontSize: 20, color: '#fff'}}>{'Search Screen'}</Text>
                }
            </Animated.View>
        </SafeAreaView>
    );
};

export default SearchScreen;
