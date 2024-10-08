// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React from 'react';
import {Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface AuthErrorProps {
    error: string;
    retry: () => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            marginTop: 25,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            textAlign: 'center',
            ...typography('Body', 200, 'Regular'),
        },
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

const AuthError = ({error, retry, theme}: AuthErrorProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.infoContainer}>
            <FormattedText
                id='mobile.oauth.switch_to_browser.error_title'
                testID='mobile.oauth.switch_to_browser.error_title'
                defaultMessage='Sign in error'
                style={style.infoTitle}
            />
            <Text style={style.errorText}>
                {`${error}.`}
            </Text>
            <Button
                buttonStyle={[style.button, buttonBackgroundStyle(theme, 'lg', 'primary', 'default')]}
                testID='mobile.oauth.try_again'
                onPress={retry}
            >
                <FormattedText
                    id='mobile.oauth.try_again'
                    defaultMessage='Try again'
                    style={buttonTextStyle(theme, 'lg', 'primary', 'default')}
                />
            </Button>
        </View>
    );
};

export default AuthError;
