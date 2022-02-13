// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

// @ts-expect-error svg imports
import HandSwipeLeft from '@assets/images/hand-swipe-left.svg';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.84),
        borderRadius: 8,
        height: 136,
        padding: 16,
        width: 247,
    },
    text: {
        ...typography('Heading', 200),
        color: 'white',
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
        >
            <View style={[styles.view, style]}>
                <HandSwipeLeft/>
                <Text style={[styles.text, textStyles]}>
                    {message}
                </Text>
            </View>
        </View>
    );
};

export default TutorialSwipeLeft;
