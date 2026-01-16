// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRewrite} from '@agents/hooks';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import StatusIndicator from '@components/post_draft/status_indicator';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const SPINNER_SIZE = 10;

const getStyleSheet = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    spinner: {
        height: SPINNER_SIZE,
        width: SPINNER_SIZE,
        borderRadius: SPINNER_SIZE / 2,
        borderWidth: 1.5,
        borderLeftColor: changeOpacity(theme.centerChannelColor, 0.7),
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.2),
        marginRight: 6,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.7),
        ...typography('Body', 75),
    },
});

function RewritingIndicator() {
    const {isProcessing} = useRewrite();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const rotation = useSharedValue(0);

    const spinnerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{rotateZ: `${rotation.value}deg`}],
    }));

    useEffect(() => {
        if (isProcessing) {
            rotation.value = 0;
            rotation.value = withRepeat(
                withTiming(360, {duration: 750, easing: Easing.linear}),
                -1,
            );
        } else {
            cancelAnimation(rotation);
        }

        return () => {
            cancelAnimation(rotation);
        };
    }, [isProcessing, rotation]);

    return (
        <StatusIndicator visible={isProcessing}>
            <View style={styles.container}>
                <Animated.View style={[styles.spinner, spinnerAnimatedStyle]}/>
                <Text style={styles.text}>
                    {intl.formatMessage({
                        id: 'ai_rewrite.rewriting',
                        defaultMessage: 'Rewriting...',
                    })}
                </Text>
            </View>
        </StatusIndicator>
    );
}

export default React.memo(RewritingIndicator);
