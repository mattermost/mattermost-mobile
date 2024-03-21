// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type StyleProp, StyleSheet, type TextStyle, type ViewStyle} from 'react-native';

import {blendColors, changeOpacity} from '@utils/theme';

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
    const styles = StyleSheet.create({
        main: {
            flex: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
        },
        fullWidth: {
            width: '100%',
        },
    });

    const backgroundStyles: BackgroundStyles = {
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
                    backgroundColor: changeOpacity(theme.sidebarText, 0.12),
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

    const sizes: ButtonSizes = StyleSheet.create({
        xs: {
            height: 24,
            paddingVertical: 6,
            paddingHorizontal: 10,
        },
        s: {
            height: 32,
            paddingVertical: 10,
            paddingHorizontal: 16,
        },
        m: {
            height: 40,
            paddingVertical: 12,
            paddingHorizontal: 20,
        },
        lg: {
            height: 48,
            paddingVertical: 14,
            paddingHorizontal: 24,
        },
    });

    return [styles.main, sizes[size], backgroundStyles[emphasis][type][state]];
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
    // Color
    let color: string = theme.buttonColor;

    if (type === 'disabled') {
        color = changeOpacity(theme.centerChannelColor, 0.32);
    }

    if ((type === 'destructive' && emphasis !== 'primary')) {
        color = theme.errorTextColor;
    }

    if ((type === 'inverted' && emphasis === 'primary') ||
        (type !== 'inverted' && emphasis !== 'primary')) {
        color = theme.buttonBg;
    }

    if (type === 'inverted' && emphasis === 'tertiary') {
        color = theme.sidebarText;
    }

    const styles = StyleSheet.create({
        main: {
            fontFamily: 'OpenSans-SemiBold',
            fontWeight: '600',
            textAlignVertical: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 1,
        },
        underline: {
            textDecorationLine: 'underline',
        },
    });

    const sizes = StyleSheet.create({
        xs: {
            fontSize: 11,
            lineHeight: 10,
            letterSpacing: 0.02,
            marginTop: 2,
        },
        s: {
            fontSize: 12,
            lineHeight: 12,
            marginTop: 1,
        },
        m: {
            fontSize: 14,
            lineHeight: 14,
            marginTop: 3,
        },
        lg: {
            fontSize: 16,
            lineHeight: 18,
            marginTop: 1,
        },
    });

    return [styles.main, sizes[size], {color}];
};
