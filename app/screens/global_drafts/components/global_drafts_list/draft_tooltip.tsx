// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Preferences} from '@constants';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    onClose: () => void;
}

const longPressGestureHandLogo = require('@assets/images/emojis/swipe.png');

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const styles = StyleSheet.create({
    close: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    descriptionContainer: {
        marginBottom: 24,
        marginTop: 12,
    },
    description: {
        color: Preferences.THEMES.denim.centerChannelColor,
        ...typography('Heading', 200),
        textAlign: 'center',
    },
    titleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    title: {
        color: Preferences.THEMES.denim.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    image: {
        height: 69,
        width: 68,
    },
});

const DraftTooltip = ({onClose}: Props) => {
    return (
        <View>
            <View style={styles.titleContainer}>
                <Image
                    source={longPressGestureHandLogo}
                    style={styles.image}
                />
                <TouchableOpacity
                    style={styles.close}
                    hitSlop={hitSlop}
                    onPress={onClose}
                    testID='draft.tooltip.close.button'
                >
                    <CompassIcon
                        color={changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.56)}
                        name='close'
                        size={18}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.descriptionContainer}>
                <FormattedText
                    id='draft.tooltip.description'
                    defaultMessage='Long-press on an item to see draft actions'
                    style={styles.description}
                    testID='draft.tooltip.description'
                />
            </View>
        </View>
    );
};

export default DraftTooltip;
