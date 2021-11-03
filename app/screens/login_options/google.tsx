// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image} from 'react-native';
import Button from 'react-native-button';

import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

const GoogleOption = ({config, onPress, theme}: LoginOptionWithConfigProps) => {
    const styles = getStyleSheet(theme);

    const handlePress = () => {
        onPress(Sso.GOOGLE);
    };

    if (config.EnableSignUpWithGoogle === 'true') {
        const additionalButtonStyle = {
            backgroundColor: '#c23321',
            borderColor: 'transparent',
            borderWidth: 0,
        };

        const logoStyle = {
            height: 18,
            marginRight: 5,
            width: 18,
        };

        const textColor = 'white';
        return (
            <Button
                key='google'
                onPress={handlePress}
                containerStyle={[styles.button, additionalButtonStyle]}
            >
                <Image
                    source={require('@assets/images/google.png')}
                    style={logoStyle}
                />
                <FormattedText
                    id='signup.google'
                    defaultMessage='Google Apps'
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

export default GoogleOption;
