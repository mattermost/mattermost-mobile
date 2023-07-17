// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleSheet, type TextStyle} from 'react-native';

// type FontFamilies = 'OpenSans' | 'Metropolis';
type FontTypes = 'Heading' | 'Body';
type FontStyles = 'SemiBold' | 'Regular' | 'Light';
type FontSizes = 25 | 50 | 75 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 | 1200;

const fontFamily = StyleSheet.create({
    OpenSans: {
        fontFamily: 'OpenSans',
    },
    Metropolis: {
        fontFamily: 'Metropolis',
    },
});

const fontStyle = StyleSheet.create({
    SemiBold: {
        fontWeight: '600',
    },
    Regular: {
        fontWeight: '400',
    },
    Light: {
        fontWeight: '300',
    },
});

const fontSize = StyleSheet.create({
    1200: {
        fontSize: 66,
        lineHeight: 48,
        letterSpacing: -0.02,
    },
    1000: {
        fontSize: 40,
        lineHeight: 48,
        letterSpacing: -0.02,
    },
    900: {
        fontSize: 36,
        lineHeight: 44,
        letterSpacing: -0.02,
    },
    800: {
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.01,
    },
    700: {
        fontSize: 28,
        lineHeight: 36,
    },
    600: {
        fontSize: 25,
        lineHeight: 30,
    },
    500: {
        fontSize: 22,
        lineHeight: 28,
    },
    400: {
        fontSize: 20,
        lineHeight: 28,
    },
    300: {
        fontSize: 18,
        lineHeight: 24,
    },
    200: {
        fontSize: 16,
        lineHeight: 24,
    },
    100: {
        fontSize: 14,
        lineHeight: 20,
    },
    75: {
        fontSize: 12,
        lineHeight: 16,
    },
    50: {
        fontSize: 11,
        lineHeight: 16,
    },
    25: {
        fontSize: 10,
        lineHeight: 16,
    },
});

type Typography = Pick<TextStyle, 'fontWeight' | 'fontSize' | 'fontFamily' | 'lineHeight' | 'letterSpacing'>

export const typography = (
    type: FontTypes = 'Body',
    size: FontSizes = 100,
    style?: FontStyles,
): Typography => {
    // Style defaults
    if (!style) {
        // eslint-disable-next-line no-param-reassign
        style = type === 'Heading' ? 'SemiBold' : 'Regular';
    }

    const font = type === 'Heading' && size > 100 ? fontFamily.Metropolis : fontFamily.OpenSans;

    const typeStyle = {
        ...font,
        ...fontSize[size],
        ...fontStyle[style],
    };

    /*
     * Use the appropriate font-file (i.e. OpenSans-SemiBold)
     * This switch statement can be removed when Android supports font-weight strings
     */
    switch (typeStyle.fontWeight) {
        case '300':
            typeStyle.fontFamily = `${typeStyle.fontFamily}-${style}`;
            break;
        case '400':
            typeStyle.fontFamily = `${typeStyle.fontFamily}`;
            break;
        case '600':
            typeStyle.fontFamily = `${typeStyle.fontFamily}-${style}`;
            break;
    }

    return typeStyle;
};
