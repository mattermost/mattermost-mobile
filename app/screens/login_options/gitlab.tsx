// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image, Text} from 'react-native';
import Button from 'react-native-button';

import LocalConfig from '@assets/config.json';
import {Sso} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

const GitLabOption = ({config, onPress, theme}: LoginOptionWithConfigProps) => {
    const styles = getStyleSheet(theme);
    const forceHideFromLocal = LocalConfig.HideGitLabLoginExperimental;

    const handlePress = () => {
        onPress(Sso.GITLAB);
    };

    if (!forceHideFromLocal && config.EnableSignUpWithGitLab === 'true') {
        const additionalButtonStyle = {
            backgroundColor: '#548',
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
                key='gitlab'
                onPress={handlePress}
                containerStyle={[styles.button, additionalButtonStyle]}
            >
                <Image
                    source={require('@assets/images/gitlab.png')}
                    style={logoStyle}
                />
                <Text
                    style={[styles.buttonText, {color: textColor}]}
                >
                    {'GitLab'}
                </Text>
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

export default GitLabOption;
