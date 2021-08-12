// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import BottomTabBar from '@components/bottom_tab_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelProps = {
    theme: Theme;
}

const Channel = ({theme}: ChannelProps) => {
    const styles = getStyleSheet(theme);

    const animatedValue = useSharedValue(0);

    const animatedTabbarStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withTiming(
                        animatedValue.value,
                        {duration: 650},

                        // (isFinished) => {
                        //     if (isFinished) {
                        //         animatedValue.value = 0;
                        //     }
                        // },
                    ),
                },
            ],
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            animatedValue.value = 100;
            clearTimeout(timer);
        }, 50);
    }, []);

    return [
        <View
            testID='channel.screen'
            key='channel.screen'
            style={styles.container}
        >
            <Text style={styles.screenTitle}>{' Channel Screen '}</Text>
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
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#ffffff',
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
