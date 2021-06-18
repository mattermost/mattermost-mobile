// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';

const EmailOption = ({config, onPress, theme}: LoginOptionWithConfigProps) => {
    const styles = getStyleSheet(theme);
    const forceHideFromLocal = LocalConfig.HideEmailLoginExperimental;

    if (!forceHideFromLocal && (config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true')) {
        const backgroundColor = config.EmailLoginButtonColor || '#2389d7';
        const additionalStyle: StyleProp<ViewStyle> = {
            backgroundColor,
        };

        if (config.EmailLoginButtonBorderColor) {
            additionalStyle.borderColor = config.EmailLoginButtonBorderColor;
        }

        const textColor = config.EmailLoginButtonTextColor || 'white';

        return (
            <Button
                key='email'
                onPress={onPress}
                containerStyle={[styles.button, additionalStyle]}
            >
                <FormattedText
                    id='signup.email'
                    defaultMessage='Email and Password'
                    style={[styles.buttonText, {color: textColor}]}
                />
            </Button>
        );
    }

    return null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    button: {
        borderRadius: 3,
        borderColor: theme.buttonBg,
        alignItems: 'center',
        borderWidth: 1,
        alignSelf: 'stretch',
        marginTop: 10,
        padding: 15,
    },
    buttonText: {
        textAlign: 'center',
        color: theme.buttonBg,
        fontSize: 17,
    },
}));

export default EmailOption;
