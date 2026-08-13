// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
    CLASSIFICATION_BANNER_HEIGHT,
    CLASSIFICATION_BANNER_MARGIN_BOTTOM,
    CLASSIFICATION_BANNER_MARGIN_HORIZONTAL,
    CLASSIFICATION_BANNER_RADIUS,
} from '@constants/view';
import {getContrastingSimpleColor} from '@utils/general';
import {typography} from '@utils/typography';

type Props = {
    visible: boolean;
    levelName: string;
    color: string;
}

const styles = StyleSheet.create({
    container: {
        height: CLASSIFICATION_BANNER_HEIGHT,
        borderRadius: CLASSIFICATION_BANNER_RADIUS,
        marginBottom: CLASSIFICATION_BANNER_MARGIN_BOTTOM,
        marginHorizontal: CLASSIFICATION_BANNER_MARGIN_HORIZONTAL,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        ...typography('Body', 25, 'SemiBold'),
        textAlign: 'center',
        textTransform: 'uppercase',
    },
});

const GlobalClassificationBanner = ({visible, levelName, color}: Props) => {
    const textColor = useMemo(() => (color ? getContrastingSimpleColor(color) : ''), [color]);

    if (!visible || !levelName || !color) {
        return null;
    }

    return (
        <View
            style={[styles.container, {backgroundColor: color}]}
            testID='global_classification_banner'
        >
            <Text
                style={[styles.text, {color: textColor}]}
                numberOfLines={1}
            >
                {levelName}
            </Text>
        </View>
    );
};

export default GlobalClassificationBanner;
