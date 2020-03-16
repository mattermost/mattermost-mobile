// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet} from 'react-native';

import {GlobalStyles} from 'app/styles';
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
        inputBoxError: {
            borderColor: colors.inputBoxBorderError,
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

export function getButtonStyle(isDisabled, colorStyles, margins = {}) {
    const buttonStyle = [GlobalStyles.authButton, colorStyles.authButton];
    if (isDisabled) {
        buttonStyle.push(colorStyles.buttonDisabled);
    }
    buttonStyle.push(margins);

    return buttonStyle;
}

export function getButtonTextStyle(isDisabled, colorStyles) {
    const buttonTextStyle = [GlobalStyles.authButtonText, colorStyles.authButtonText];
    if (isDisabled) {
        buttonTextStyle.push(colorStyles.buttonTextDisabled);
    }
    return buttonTextStyle;
}

export function getColorStyles(colorScheme) {
    return colorScheme === 'dark' ? createStyleSheet(darkColors) : createStyleSheet(lightColors);
}

export function getInputStyle(isDisabled, error, colorStyles, margin = {}) {
    const inputStyle = [GlobalStyles.inputBox, colorStyles.inputBox];
    if (isDisabled) {
        inputStyle.push(GlobalStyles.inputBoxDisabled);
        inputStyle.push(colorStyles.inputBoxDisabled);
    } else if (error) {
        inputStyle.push(GlobalStyles.inputBoxError);
        inputStyle.push(colorStyles.inputBoxError);
    } else {
        inputStyle.push(GlobalStyles.inputBoxBlur);
    }

    inputStyle.push(margin);
    return inputStyle;
}

export function getLogo(colorScheme) {
    return colorScheme === 'dark' ? require('assets/images/logo_dark.png') : require('assets/images/logo_light.png');
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