// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type StyleProp, StyleSheet, type TextStyle, type ViewStyle} from 'react-native';

import {blendColors, changeOpacity} from '@utils/theme';

import {typography} from './typography';

export const getBackgroundStyles = (theme: Theme): BackgroundStyles => {
    return {
        primary: {
            default: {
                default: {
                    backgroundColor: theme.buttonBg,
                },
                hover: {
                    backgroundColor: blendColors(theme.buttonBg, '#000000', 0.08),
                },
                active: {
                    backgroundColor: blendColors(theme.buttonBg, '#000000', 0.16),
                },
                focus: {
                    backgroundColor: theme.buttonBg,
                    borderColor: changeOpacity('#FFFFFF', 0.32),
                    borderWidth: 2,
                },
            },
            destructive: {
                default: {
                    backgroundColor: theme.errorTextColor,
                },
                hover: {
                    backgroundColor: blendColors(theme.errorTextColor, '#000000', 0.08),
                },
                active: {
                    backgroundColor: blendColors(theme.errorTextColor, '#000000', 0.16),
                },
                focus: {
                    backgroundColor: theme.errorTextColor,
                    borderColor: changeOpacity('#FFFFFF', 0.32),
                    borderWidth: 2,
                },
            },
            inverted: {
                default: {
                    backgroundColor: theme.buttonColor,
                },
                hover: {
                    backgroundColor: blendColors(theme.buttonColor, '#000000', 0.08),
                },
                active: {
                    backgroundColor: blendColors(theme.buttonColor, '#000000', 0.16),
                },
                focus: {
                    backgroundColor: theme.buttonColor,
                    borderColor: changeOpacity('#FFFFFF', 0.32),
                    borderWidth: 2,
                },
            },
            disabled: {
                default: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                hover: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                active: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                focus: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
            },
        },
        secondary: {
            default: {
                default: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0),
                    borderColor: theme.buttonBg,
                    borderWidth: 1,
                },
                hover: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.08),
                    borderColor: theme.buttonBg,
                    borderWidth: 1,
                },
                active: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.16),
                    borderColor: theme.buttonBg,
                    borderWidth: 1,
                },
                focus: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0),
                    borderColor: theme.sidebarTextActiveBorder,
                    borderWidth: 2,
                },
            },
            destructive: {
                default: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0),
                    borderColor: theme.errorTextColor,
                    borderWidth: 1,
                },
                hover: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
                    borderColor: theme.errorTextColor,
                    borderWidth: 1,
                },
                active: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.16),
                    borderColor: theme.errorTextColor,
                    borderWidth: 1,
                },
                focus: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0),
                    borderColor: changeOpacity(theme.errorTextColor, 0.68), // @to-do; needs 32% white?
                    borderWidth: 2,
                },
            },
            inverted: {
                default: {
                    backgroundColor: changeOpacity(theme.buttonColor, 0),
                    borderColor: theme.buttonColor,
                    borderWidth: 1,
                },
                hover: {
                    backgroundColor: changeOpacity(theme.buttonColor, 0.08),
                    borderColor: theme.buttonColor,
                    borderWidth: 1,
                },
                active: {
                    backgroundColor: changeOpacity(theme.buttonColor, 0.16),
                    borderColor: theme.buttonColor,
                    borderWidth: 1,
                },
                focus: {
                    backgroundColor: changeOpacity(theme.buttonColor, 0),
                    borderColor: theme.sidebarTextActiveBorder,
                    borderWidth: 2,
                },
            },
            disabled: {
                default: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0),
                    borderColor: changeOpacity(theme.centerChannelColor, 0.32),
                    borderWidth: 1,
                },
                hover: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0),
                    borderColor: changeOpacity(theme.centerChannelColor, 0.32),
                    borderWidth: 1,
                },
                active: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0),
                    borderColor: changeOpacity(theme.centerChannelColor, 0.32),
                    borderWidth: 1,
                },
                focus: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0),
                    borderColor: changeOpacity(theme.centerChannelColor, 0.32),
                    borderWidth: 1,
                },
            },
        },
        tertiary: {
            default: {
                default: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.08),
                },
                hover: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.12),
                },
                active: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.16),
                },
                focus: {
                    backgroundColor: changeOpacity(theme.buttonBg, 0.08),
                    borderColor: theme.sidebarTextActiveBorder,
                    borderWidth: 2,
                },
            },
            destructive: {
                default: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
                },
                hover: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.12),
                },
                active: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.16),
                },
                focus: {
                    backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
                    borderColor: changeOpacity(theme.errorTextColor, 0.68), // @to-do; needs 32% white?
                    borderWidth: 2,
                },
            },
            inverted: {
                default: {
                    backgroundColor: changeOpacity(theme.buttonColor, 0.12),
                },
                hover: {
                    backgroundColor: changeOpacity(theme.sidebarText, 0.16),
                },
                active: {
                    backgroundColor: changeOpacity(theme.sidebarText, 0.24),
                },
                focus: {
                    backgroundColor: changeOpacity(theme.sidebarText, 0.08),
                    borderColor: theme.sidebarTextActiveBorder, // @to-do; needs 32% white?
                    borderWidth: 2,
                },
            },
            disabled: {
                default: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                hover: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                active: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
                focus: {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                },
            },
        },
        link: {
            default: {
                default: {
                    backgroundColor: 'transparent',
                },
                hover: {
                    backgroundColor: 'transparent',
                },
                active: {
                    backgroundColor: 'transparent',
                },
                focus: {
                    backgroundColor: 'transparent',
                },
            },
            inverted: {
                default: {
                    backgroundColor: 'transparent',
                },
                hover: {
                    backgroundColor: 'transparent',
                },
                active: {
                    backgroundColor: 'transparent',
                },
                focus: {
                    backgroundColor: 'transparent',
                },
            },
            disabled: {
                default: {
                    backgroundColor: 'transparent',
                },
                hover: {
                    backgroundColor: 'transparent',
                },
                active: {
                    backgroundColor: 'transparent',
                },
                focus: {
                    backgroundColor: 'transparent',
                },
            },
            destructive: {
                default: {
                    backgroundColor: 'transparent',
                },
                hover: {
                    backgroundColor: 'transparent',
                },
                active: {
                    backgroundColor: 'transparent',
                },
                focus: {
                    backgroundColor: 'transparent',
                },
            },
        },
    };
};

export const buttonSizeStyles: ButtonSizes = StyleSheet.create({
    xs: {
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    s: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    m: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    lg: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
});

export const buttonStyles = StyleSheet.create({
    main: {
        borderRadius: 4,
    },
    fullWidth: {
        width: '100%',
    },
});

export const buttonTextSizeStyles = StyleSheet.create({
    xs: {
        ...typography('Body', 50, 'SemiBold'),
    },
    s: {
        ...typography('Body', 75, 'SemiBold'),
    },
    m: {
        ...typography('Body', 100, 'SemiBold'),
    },
    lg: {
        ...typography('Body', 200, 'SemiBold'),
    },
});

/**
 * Returns the appropriate Style object for <View style={} />
 *
 *
 * @param theme
 * @param size
 * @param emphasis
 * @param type
 * @param state
 * @returns
 */
export const buttonBackgroundStyle = (
    theme: Theme,
    size: ButtonSize = 'm',
    emphasis: ButtonEmphasis = 'primary',
    type: ButtonType = 'default',
    state: ButtonState = 'default',
): StyleProp<ViewStyle> => {
    const backgroundStyles = getBackgroundStyles(theme);

    return [buttonStyles.main, buttonSizeStyles[size], backgroundStyles[emphasis][type][state]];
};

/**
 * Returns the appropriate TextStyle for the <Text style={} ...> object inside the button.
 *
 *
 * @param theme
 * @param size
 * @param emphasis
 * @param type
 * @returns
 */
export const buttonTextStyle = (
    theme: Theme,
    size: ButtonSize = 'm',
    emphasis: ButtonEmphasis = 'primary',
    type: ButtonType = 'default',
): StyleProp<TextStyle> => {
    return [buttonTextSizeStyles[size], {color: getColorByType(theme, type, emphasis)}];
};

const getColorByType = (theme: Theme, type: ButtonType, emphasis: ButtonEmphasis) => {
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
