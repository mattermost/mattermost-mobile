// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    message: {
        color: changeOpacity(theme.centerChannelColor, 0.8),
        ...typography('Body', 100, 'Regular'),
    },
    title: {
        color: theme.centerChannelColor,
        marginBottom: 12,
        ...typography('Heading', 400, 'SemiBold'),
    },
    welcome: {
        color: theme.centerChannelColor,
        marginBottom: 12,
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const TownSquare = ({displayName, theme}: Props) => {
    const styles = getStyleSheet(theme);
    return (
        <View>
            <FormattedText
                defaultMessage='Beginning of {name}'
                id='intro_messages.beginning'
                style={styles.title}
                values={{name: displayName}}
            />
            <FormattedText
                defaultMessage='Welcome to {name}'
                id='mobile.intro_messages.default_welcome'
                style={styles.welcome}
                values={{name: displayName}}
            />
            <FormattedText
                defaultMessage='This is the first channel teammates see when they sign up - use it for posting updates everyone needs to know.'
                id='mobile.intro_messages.default_message'
                style={styles.message}
                values={{name: displayName}}
            />
        </View>
    );
};

export default TownSquare;
