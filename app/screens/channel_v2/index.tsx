// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import BottomTabBar from '@components/bottom_tab_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';
import React from 'react';
import {Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

const Channel = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const animatedValue = useSharedValue(0);

    const animatedTabbarStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withTiming(
                        animatedValue.value,
                        {duration: 500},
                        (isFinished) => {
                            if (isFinished) {
                                animatedValue.value = 0;
                            }
                        },
                    ),
                },
            ],
        };
    }, []);

    return [
        <View
            testID='channel.screen'
            key='channel.screen'
            style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}
        >
            <Text style={{color: 'white', fontSize: 30}}>{' Channel Screen '}</Text>
            <Animated.View
                key='bottom.tabbar'
                style={[styles.tabContainer, animatedTabbarStyle]}
            >
                <BottomTabBar theme={theme}/>
            </Animated.View>
        </View>,
    ];
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: theme.centerChannelBg,
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
    },
    textContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 30,
        alignSelf: 'center',
    },
}));

export default Channel;
