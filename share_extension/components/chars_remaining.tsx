// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {Preferences} from '@mm-redux/constants';

interface CharsRemainingProps {
    text?: string;
}

const theme = Preferences.THEMES.default;

const CharsRemaining = ({text}: CharsRemainingProps) => {
    const count = text?.trim().length || 0;
    const messageLengthRemaining = `${count}/${MAX_MESSAGE_LENGTH_FALLBACK}`;
    const tooLong = MAX_MESSAGE_LENGTH_FALLBACK - count;
    const textStyle = tooLong < 0 ? styles.textTooLong : styles.textLengthOk;

    const renderStyle = [styles.messageLengthRemaining, textStyle];
    return (
        <View style={styles.container}>
            <Text style={renderStyle}>
                {messageLengthRemaining}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'flex-end',
        top: -10,
    },
    messageLengthRemaining: {
        paddingBottom: 5,
        paddingLeft: 15,
        paddingRight: 15,
        opacity: 0.5,
    },
    textLengthOk: {
        color: theme.centerChannelColor,
    },
    textTooLong: {
        color: theme.errorTextColor,
    },
});

export default CharsRemaining;
