// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type NewMessagesLineProps = {
    theme: Theme;
}

function MessageLine({theme}: NewMessagesLineProps) {
    const styles = getStyleFromTheme(theme);

    const text = (
        <FormattedText
            id='mobile.login_options.separator_text'
            defaultMessage='or log in with'
            style={styles.text}
            testID='mobile.login_options.separator_text'
        />
    );

    return (
        <View style={styles.container}>
            <View style={styles.line}/>
            {text}
            <View style={styles.line}/>
        </View>
    );
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        marginTop: 24,
        marginBottom: 8,
        alignItems: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    line: {
        flex: 1,
        height: 0.4,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.64),
    },
    text: {
        marginRight: 6,
        marginLeft: 6,
        textAlign: 'center',
        ...typography('Body', 25, 'SemiBold'),
    },
}));

export default MessageLine;
