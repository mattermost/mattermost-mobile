// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Preferences} from '@mm-redux/constants';

interface ShareErrorProps {
    message?: string;
}

const theme = Preferences.THEMES.default;

const ShareError = ({message}: ShareErrorProps) => {
    let error;
    if (message) {
        error = (
            <Text style={styles.unauthenticated}>
                {message}
            </Text>
        );
    } else {
        error = (
            <FormattedText
                defaultMessage='Authentication required: Please first login using the app.'
                id='mobile.extension.authentication_required'
                style={styles.unauthenticated}
            />
        );
    }

    return (
        <View
            style={styles.flex}
        >
            <View style={styles.container}>
                {error}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 35,
    },
    unauthenticated: {
        color: theme.errorTextColor,
        fontSize: 14,
    },
});

export default ShareError;
