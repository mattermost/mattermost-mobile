// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet} from 'react-native';

import {darkColors, lightColors} from 'app/styles/colors';

function createStyleSheet(colors) {
    return StyleSheet.create({
        authButton: {
            backgroundColor: colors.authButtonBg,
        },
        authButtonText: {
            color: colors.authButtonText,
        },
        buttonDisabled: {
            backgroundColor: colors.buttonBgDisabled,
        },
        buttonTextDisabled: {
            color: colors.buttonTextDisabled,
        },
        container: {
            backgroundColor: colors.containerBg,
        },
        header: {
            color: colors.headerText,
        },
        inputBox: {
            borderColor: colors.inputBoxBorder,
            color: colors.inputBoxText,
        },
        inputBoxDisabled: {
            backgroundColor: colors.inputBoxBgDisabled,
            color: colors.inputBoxTextDisabled,
        },
        inputBoxFocused: {
            borderColor: colors.inputBoxBorderFocused,
            color: colors.inputBoxTextFocused,
        },
        link: {
            color: colors.linkText,
        },
        navigation: {
            backgroundColor: colors.navigationBg,
            color: colors.navigationText,
        },
    });
}

export function getColorStyles(colorScheme) {
    return colorScheme === 'light' ? createStyleSheet(lightColors) : createStyleSheet(darkColors);
}

export function getLogo(colorScheme) {
    return colorScheme === 'light' ? require('assets/images/logo_light.png') : require('assets/images/logo_dark.png');
}

export function getStyledNavigationOptions(colorStyles) {
    return {
        layout: {
            backgroundColor: colorStyles.container.backgroundColor,
        },
        topBar: {
            backButton: {
                color: colorStyles.navigation.color,
            },
            background: {
                color: colorStyles.navigation.backgroundColor,
            },
            title: {
                color: colorStyles.navigation.color,
            },
        },
    };
}