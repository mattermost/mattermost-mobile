// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application';
import React, {useEffect} from 'react';
import {defineMessages} from 'react-intl';
import {Keyboard, StyleSheet, type TextStyle, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';

const style = StyleSheet.create({
    info: {
        position: 'absolute',
        bottom: 0,
        marginLeft: 20,
        marginBottom: 12,
    },
    version: {
        fontSize: 12,
    },
});

type AppVersionProps = {
    isWrapped?: boolean;
    textStyle?: TextStyle;
}

const messages = defineMessages({
    appVersion: {
        id: 'mobile.about.appVersion',
        defaultMessage: 'App Version: {version} (Build {number})',
    },
});

const AppVersion = ({isWrapped = true, textStyle = {}}: AppVersionProps) => {
    const opacity = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(opacity.value, {duration: 250}),
        };
    });

    useEffect(() => {
        const willHide = Keyboard.addListener('keyboardDidHide', () => {
            opacity.value = 1;
        });
        const willShow = Keyboard.addListener('keyboardDidShow', () => {
            opacity.value = 0;
        });

        return () => {
            willHide.remove();
            willShow.remove();
        };
    }, []);

    const appVersion = (
        <FormattedText
            {...messages.appVersion}
            style={StyleSheet.flatten([style.version, textStyle])}
            values={{
                version: nativeApplicationVersion,
                number: nativeBuildVersion,
            }}
        />
    );

    if (!isWrapped) {
        return appVersion;
    }

    return (
        <Animated.View
            pointerEvents='none'
            style={animatedStyle}
        >
            <View style={style.info}>
                {appVersion}
            </View>
        </Animated.View>
    );
};

export default AppVersion;
