// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {StyleProp, StyleSheet, TextStyle} from 'react-native';

type FontSizes = 25 | 50 | 75 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
type FontStyles = 'Semibold' | 'Regular' | 'Light';

// type FontFamilies = 'OpenSans' | 'Metropolis';
type FontTypes = 'Heading' | 'Body';

type TypographyType = {
    [key in `${FontTypes}${FontSizes}`]: StyleProp<TextStyle>;
} & {
    [key in `${FontTypes}${FontSizes}${FontStyles}`]: StyleProp<TextStyle>
}

// type FontStyle = {
//     [key in FontStyles]: {
//         fontWeight: string;
//     }
// }
// type FontSize = {
//     [key in FontSizes]: {
//         fontSize: number;
//         lineHeight: number;
//         letterSpacing?: number;
//     }
// }
// type FontFamily = {
//     [key in FontFamilies]: {
//         fontFamily: string;
//     }
// }
// type FontType = {
//     [key in FontTypes]: FontFamily & FontType
// }

const fontStyle = StyleSheet.create({
    Semibold: {
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

const fontFamily = StyleSheet.create({
    Metropolis: {
        fontFamily: 'Metropolis',
    },
    OpenSans: {
        fontFamily: 'Open Sans',
    },
});

const fontType = StyleSheet.create({
    Heading: {
        ...fontFamily.Metropolis,
        ...fontStyle.Semibold,
    },
    Body: {
        ...fontFamily.OpenSans,
        ...fontStyle.Regular,
    },
});

const Typography = Object.entries(fontType).reduce((previous, type) => {
    const t = Object.entries(fontSize).reduce((prev, size) => {
        const final = {
            ...type[1],
            ...size[1],
        };

        const s = type[0] === 'Heading' ? {
            [`${type[0]}${size[0]}Regular`]: {...final, ...fontStyle.Regular},
            [`${type[0]}${size[0]}Light`]: {...final, ...fontStyle.Light},
        } : {
            [`${type[0]}${size[0]}Semibold`]: {...final, ...fontStyle.Semibold},
            [`${type[0]}${size[0]}Light`]: {...final, ...fontStyle.Regular},
        };
        return {
            ...prev,
            ...s,
            [`${type[0]}${size[0]}`]: final,
        };
    }, {});

    return {...previous, ...t};
}, {});

export default Typography as TypographyType;
