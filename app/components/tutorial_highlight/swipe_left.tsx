// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import HandSwipeLeft from './swipe_left_hand';

type Props = {
    containerStyle?: StyleProp<ViewStyle>;
    message: string;
    style?: StyleProp<ViewStyle>;
    textStyles?: StyleProp<TextStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    view: {
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderRadius: 8,
        height: 136,
        padding: 16,
        width: 247,
    },
    text: {
        ...typography('Heading', 200),
        color: theme.centerChannelColor,
        marginTop: 8,
        paddingHorizontal: 12,
        textAlign: 'center',
    },
}));

const TutorialSwipeLeft = ({containerStyle, message, style, textStyles}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            pointerEvents='none'
            style={[styles.container, containerStyle]}
            testID='tutorial_swipe_left'
        >
            <View style={[styles.view, style]}>
                <HandSwipeLeft fillColor={theme.centerChannelColor}/>
                <Text style={[styles.text, textStyles]}>
                    {message}
                </Text>
            </View>
        </View>
    );
};

export default TutorialSwipeLeft;
