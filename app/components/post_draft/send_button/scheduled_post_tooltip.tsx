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
    container: {
        paddingHorizontal: 4,
        paddingVertical: 8,
        flexDirection: 'column',
        gap: 18,
    },
    close: {
        position: 'absolute',
        top: 0,
        right: 0,
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

const ScheduledPostTooltip = ({onClose}: Props) => {
    return (
        <View
            style={styles.container}
            testID='scheduled_post_tutorial_tooltip'
        >
            <View style={styles.titleContainer}>
                <Image
                    source={longPressGestureHandLogo}
                    style={styles.image}
                />
                <TouchableOpacity
                    style={styles.close}
                    hitSlop={hitSlop}
                    onPress={onClose}
                    testID='scheduled_post.tooltip.close.button'
                >
                    <CompassIcon
                        color={changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.56)}
                        name='close'
                        size={18}
                        testID='scheduled_post_tutorial_tooltip.close'
                    />
                </TouchableOpacity>
            </View>
            <View>
                <FormattedText
                    id='scheduled_post.feature_tooltip'
                    defaultMessage='Type a message and long press the send button to schedule it for a later time.'
                    style={styles.description}
                    testID='scheduled_post.tooltip.description'
                />
            </View>
        </View>
    );
};

export default ScheduledPostTooltip;
