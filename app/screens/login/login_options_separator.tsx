// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

type LoginOptionsSeparatorProps = {
    theme: Theme;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    line: {
        flex: 1,
        height: 0.4,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    text: {
        marginRight: 6,
        marginLeft: 6,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        fontFamily: 'OpenSans',
        fontSize: 12,
        top: -2,
    },
}));

const LoginOptionsSeparator = ({theme}: LoginOptionsSeparatorProps) => {
    const styles = getStyleFromTheme(theme);

    return (
        <View style={styles.container}>
            <View style={styles.line}/>
            <FormattedText
                id='mobile.login_options.separator_text'
                defaultMessage='or log in with'
                style={styles.text}
                testID='mobile.login_options.separator_text'
            />
            <View style={styles.line}/>
        </View>
    );
};

export default LoginOptionsSeparator;
