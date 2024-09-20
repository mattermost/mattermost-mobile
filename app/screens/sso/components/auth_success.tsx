// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface AuthSuccessProps {
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

const AuthSuccess = ({theme}: AuthSuccessProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.infoContainer}>
            <Loading/>
            <FormattedText
                id='mobile.oauth.success.title'
                testID='mobile.oauth.success.title'
                defaultMessage='Authentication successful'
                style={style.infoTitle}
            />
            <FormattedText
                id='mobile.oauth.success.description'
                testID='mobile.oauth.success.description'
                defaultMessage='Signing in now, just a moment...'
                style={style.infoText}
            />
        </View>
    );
};

export default AuthSuccess;
