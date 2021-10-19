// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {changeOpacity} from '@utils/theme';

/**
 * Returns the appropriate background color style object
 *
 * For active/hover states, it returns a string[] of colors for <LinearGradient />
 * For the rest, it returns a ViewStyle for <View style={} />
 *
 * @param theme
 * @returns
 */
export const backgroundStyle: BackgroundStyle = (theme: Theme) => {
    return {
        primary: {
            default: {
                default: {
                    backgroundColor: theme.buttonBg,
                },
                hover: [
                    changeOpacity('#000000', 0.08),
                    changeOpacity('#000000', 0.08),
                    theme.buttonBg,
                ],
                active: [
                    changeOpacity('#000000', 0.16),
                    changeOpacity('#000000', 0.16),
                    theme.buttonBg,
                ],
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
                hover: [
                    changeOpacity('#000000', 0.08),
                    changeOpacity('#000000', 0.08),
                    theme.errorTextColor,
                ],
                active: [
                    changeOpacity('#000000', 0.16),
                    changeOpacity('#000000', 0.08),
                    theme.errorTextColor,
                ],
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
                hover: [
                    changeOpacity('#000000', 0.08),
                    changeOpacity('#000000', 0.08),
                    theme.buttonColor,
                ],
                active: [
                    changeOpacity('#000000', 0.16),
                    changeOpacity('#000000', 0.16),
                    theme.buttonColor,
                ],
                focus: {
                    backgroundColor: theme.buttonColor,
                    borderColor: changeOpacity('#FFFFFF', 0.32),
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
                    backgroundColor: changeOpacity('#FFFFFF', 0.12),
                },
                hover: {
                    backgroundColor: changeOpacity('#FFFFFF', 0.16),
                },
                active: {
                    backgroundColor: changeOpacity('#FFFFFF', 0.24),
                },
                focus: {
                    backgroundColor: changeOpacity('#FFFFFF', 0.08),
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

/**
 * Returns the appropriate text color for the button.
 *
 * Handles the emphasis & types, button state does not change text color.
 *
 * @param theme
 * @param emphasis
 * @param type
 * @returns
 */
export const textColor = (theme: Theme, emphasis: ButtonEmphasis, type: ButtonType) => {
    if (type === 'disabled') {
        return changeOpacity(theme.centerChannelColor, 0.32);
    }

    if ((type === 'destructive' && emphasis !== 'primary')) {
        return theme.errorTextColor;
    }

    if ((type === 'inverted' && emphasis === 'primary') ||
        (type !== 'inverted' && emphasis !== 'primary')) {
        return theme.buttonBg;
    }

    return theme.buttonColor;
};
