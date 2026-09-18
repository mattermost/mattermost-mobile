// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useWindowDimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {RTCView} from 'react-native-webrtc';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {CallsTheme} from '@calls/types/calls';

const SELF_VIEW_WIDTH = 96;
const SELF_VIEW_HEIGHT = 128;
const SELF_VIEW_TOP = 24;
const SELF_VIEW_RIGHT = 16;

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    container: {
        position: 'absolute',
        top: SELF_VIEW_TOP,
        right: SELF_VIEW_RIGHT,
        width: SELF_VIEW_WIDTH,
        height: SELF_VIEW_HEIGHT,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: theme.callsBgRgb,
    },
    video: {
        flex: 1,
    },
}));

type Props = {
    url: string;
}

const SelfView = ({url}: Props) => {
    const theme = useTheme() as CallsTheme;
    const style = getStyleSheet(theme);
    const {width: windowWidth, height: windowHeight} = useWindowDimensions();

    // Bounds for the drag, so the self-view can never be lost off-screen: the
    // view sits at (top: SELF_VIEW_TOP, right: SELF_VIEW_RIGHT) at rest, so the
    // offsets are measured from there.
    const minX = -(windowWidth - SELF_VIEW_RIGHT - SELF_VIEW_WIDTH);
    const maxX = SELF_VIEW_RIGHT;
    const minY = -SELF_VIEW_TOP;
    const maxY = windowHeight - SELF_VIEW_TOP - SELF_VIEW_HEIGHT;

    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    const pan = Gesture.Pan().
        onStart(() => {
            startX.value = offsetX.value;
            startY.value = offsetY.value;
        }).
        onUpdate((e) => {
            offsetX.value = Math.min(maxX, Math.max(minX, startX.value + e.translationX));
            offsetY.value = Math.min(maxY, Math.max(minY, startY.value + e.translationY));
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: offsetX.value}, {translateY: offsetY.value}],
    }));

    return (
        <GestureDetector gesture={pan}>
            <Animated.View
                testID='call_screen.video.self_view'
                style={[style.container, animatedStyle]}
            >
                <RTCView
                    streamURL={url}
                    objectFit='cover'
                    mirror={true}
                    style={style.video}
                />
            </Animated.View>
        </GestureDetector>
    );
};

export default SelfView;
