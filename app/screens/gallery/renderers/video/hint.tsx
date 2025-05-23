// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {typography} from '@utils/typography';

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'none',
    },
    hintContainer: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    arrow: {
        color: 'white',
        fontSize: 18,
        marginRight: 8,
    },
    text: {
        color: 'white',
        ...typography('Body', 200, 'SemiBold'),
    },
});

const VideoHint = () => {
    return (
        <View style={styles.container}>
            <Animated.View
                style={styles.hintContainer}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
            >
                <Text style={styles.arrow}>{'▶️'}</Text>
                <FormattedText
                    id='gallery.video_hint'
                    defaultMessage='Tap to show video controls'
                    style={styles.text}
                />
            </Animated.View>
        </View>
    );
};

export default VideoHint;
