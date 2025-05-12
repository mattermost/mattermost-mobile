// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Preferences from '@constants/preferences';

import {buttonBackgroundStyle, buttonStyles, getBackgroundStyles, buttonSizeStyles, buttonTextStyle, buttonTextSizeStyles} from './buttonStyles';
import {changeOpacity} from './theme';

describe('get the style of a button', () => {
    const defaultStyle = buttonStyles.main;
    const theme = Preferences.THEMES.denim;
    const bgStyles = getBackgroundStyles(theme);

    test('button default values', () => {
        const tests = [{
            getStyle: () => buttonBackgroundStyle(theme),
            expected: [
                defaultStyle,
                buttonSizeStyles.m,
                bgStyles.primary.default.default,
            ],
        }, {
            getStyle: () => buttonBackgroundStyle(theme, 'xs'),
            expected: [
                defaultStyle,
                buttonSizeStyles.xs,
                bgStyles.primary.default.default,
            ],
        }, {
            getStyle: () => buttonBackgroundStyle(theme, 'lg', 'secondary'),
            expected: [
                defaultStyle,
                buttonSizeStyles.lg,
                bgStyles.secondary.default.default,
            ],
        }];

        tests.forEach((t) => {
            const style = t.getStyle();
            expect(style).toEqual(t.expected);
        });
    });

    test('button style', () => {
        const btnEnphasis: ButtonEmphasis[] = ['primary', 'secondary', 'tertiary', 'link'];
        const btnSizes: ButtonSize[] = ['lg', 'm', 's', 'xs'];
        const btnTypes: ButtonType[] = ['default', 'destructive', 'disabled', 'inverted'];
        const btnState: ButtonState[] = ['active', 'default', 'focus', 'hover'];

        btnEnphasis.forEach((emphasis) => {
            btnSizes.forEach((size) => {
                btnTypes.forEach((type) => {
                    btnState.forEach((state) => {
                        const style = buttonBackgroundStyle(theme, size, emphasis, type, state);
                        expect(style).toEqual([
                            defaultStyle,
                            buttonSizeStyles[size],
                            bgStyles[emphasis][type][state],
                        ]);
                    });
                });
            });
        });
    });
});

describe('get the text style of a button', () => {
    const theme = Preferences.THEMES.denim;

    test('button text default values', () => {
        const tests = [{
            getStyle: () => buttonTextStyle(theme),
            expected: [
                buttonTextSizeStyles.m,
                {color: theme.buttonColor},
            ],
        }, {
            getStyle: () => buttonTextStyle(theme, 'xs'),
            expected: [
                buttonTextSizeStyles.xs,
                {color: theme.buttonColor},
            ],
        }, {
            getStyle: () => buttonTextStyle(theme, 'lg', 'secondary'),
            expected: [
                buttonTextSizeStyles.lg,
                {color: theme.buttonBg},
            ],
        }];

        tests.forEach((t) => {
            const style = t.getStyle();
            expect(style).toEqual(t.expected);
        });
    });

    test('button style', () => {
        const btnEnphasis: ButtonEmphasis[] = ['primary', 'secondary', 'tertiary', 'link'];
        const btnSizes: ButtonSize[] = ['lg', 'm', 's', 'xs'];
        const btnTypes: ButtonType[] = ['default', 'destructive', 'disabled', 'inverted'];

        const getColor = (type: ButtonType, emphasis: ButtonEmphasis) => {
            if (type === 'disabled') {
                return changeOpacity(theme.centerChannelColor, 0.32);
            }

            if (type === 'destructive') {
                if (emphasis === 'primary') {
                    return theme.buttonColor;
                }
                return theme.errorTextColor;
            }

            if (type === 'inverted') {
                if (emphasis === 'primary') {
                    return theme.buttonBg;
                }
                return theme.buttonColor;
            }

            if (emphasis === 'primary') {
                return theme.buttonColor;
            }

            return theme.buttonBg;
        };

        btnEnphasis.forEach((emphasis) => {
            btnSizes.forEach((size) => {
                btnTypes.forEach((type) => {
                    const style = buttonTextStyle(theme, size, emphasis, type);
                    expect(style).toEqual([
                        buttonTextSizeStyles[size],
                        {color: getColor(type, emphasis)},
                    ]);
                });
            });
        });
    });
});
