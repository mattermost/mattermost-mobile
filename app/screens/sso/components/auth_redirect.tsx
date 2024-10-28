// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface AuthRedirectProps {
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        infoContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        infoTitle: {
            color: theme.centerChannelColor,
            marginBottom: 4,
            ...typography('Heading', 700),
        },
    };
});

const AuthRedirect = ({theme}: AuthRedirectProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.infoContainer}>
            <FormattedText
                id='mobile.oauth.switch_to_browser.title'
                testID='mobile.oauth.switch_to_browser.title'
                defaultMessage='Redirecting...'
                style={style.infoTitle}
            />
            <FormattedText
                id='mobile.oauth.switch_to_browser'
                testID='mobile.oauth.switch_to_browser'
                defaultMessage='You are being redirected to your login provider'
                style={style.infoText}
            />
        </View>
    );
};

export default AuthRedirect;
