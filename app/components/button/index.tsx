// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';

// import LinearGradient from 'react-native-linear-gradient';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';
import {changeOpacity} from '@utils/theme';

type ButtonSize = 'xs' | 's' | 'm' | 'lg'
type ButtonEmphasis = 'primary' | 'secondary' | 'tertiary' | 'link'
type ButtonType = 'default' | 'destructive' | 'inverted' | 'disabled'
type ButtonState = 'default' | 'hover' | 'active' | 'focus'

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
const textColor = (theme: Theme, emphasis: ButtonEmphasis, type: ButtonType) => {
    if (type === 'disabled') {
        return changeOpacity(theme.centerChannelColor, 0.32);
    }

    if ((type === 'inverted' && emphasis === 'primary') ||
        (type !== 'inverted' && emphasis !== 'primary')) {
        return theme.buttonBg;
    }

    if ((type === 'destructive' && emphasis !== 'primary')) {
        return theme.errorTextColor;
    }

    return theme.buttonColor;
};

type BackgroundProps = {
    theme: Theme;
    emphasis: ButtonEmphasis;
    type: ButtonType;
    state: ButtonState;
    children: React.ReactNode;
    styles: {};
}

/**
 * The Button Background component; returning a <View /> or <LinearGradient />
 * with the child <Text /> element.
 *
 * Notes:
 * - Emphasis: Primary & Link Work (Secondary / Tertiary to do)
 * - Type: Destructive, Inverted
 * - State: Only default (Hover, Active, Focus to-do)
 *
 * @param props
 * @returns
 */
const Background = (props: BackgroundProps) => {
    const {theme, emphasis, type, state, children, styles} = props;

    let bg = theme.buttonBg;
    if (type === 'inverted') {
        bg = theme.buttonColor;
    }

    // @to-do: Does this need a white background?
    if (type === 'disabled') {
        bg = changeOpacity(theme.centerChannelColor, 0.08);
    }
    if (type === 'destructive') {
        bg = theme.errorTextColor;
    }
    if (emphasis === 'link') {
        bg = 'transparent';
    }

    // @to-do: This border pushes outwards; not quite border-box
    const border = state === 'focus' ? {
        borderColor: 'rgba(255, 255, 255, 0.32)',
        borderWidth: 2,
    } : {};

    // @to-do: Handle various button emphasis and associated states / types
    /*
    if (emphasis === 'primary' && state !== 'default' && state !== 'focus') {
        let bg1 = bg;
        let bg2 = state === 'hover' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.16)';

        if (type === 'inverted') {
            bg1 = theme.buttonBg;
            bg2 = state === 'hover' ? 'rgba(255, 255, 255, .08)' : 'rgba(255, 255, 255, 0.16)';
        }

        return (
            <LinearGradient
                style={[style, {backgroundColor: bg}, border]}
                colors={[bg2, bg1]}
            >
                {children}
            </LinearGradient>
        );
    }
    */

    return (
        <View style={[{backgroundColor: bg}, border, styles]}>
            {children}
        </View>
    );
};

const textStyleCollection = StyleSheet.create({
    default: {
        fontFamily: Platform.OS === 'android' ? 'OpenSans-SemiBold' : 'OpenSans',
        fontWeight: '600',
    },
    underline: {
        textDecorationLine: 'underline',
    },
    xs: {
        fontSize: 11,
        lineHeight: 10,
        letterSpacing: 0.02,
    },
    s: {
        fontSize: 12,
        lineHeight: 11,
    },
    m: {
        fontSize: 14,
        lineHeight: 14,
    },
    lg: {
        fontSize: 16,
        lineHeight: 18,
    },
});

const buttonStyleCollection = StyleSheet.create({
    default: {
        flex: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
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
    fullWidth: {
        width: '100%',
    },
});

type ButtonProps = {
    size?: ButtonSize;
    emphasis?: ButtonEmphasis;
    type?: ButtonType;
    state?: ButtonState;
    iconLeft?: string;
    iconRight?: string;
    text: string;
    fullWidth?: boolean;
    onPress?: () => {};
    onLongPress?: () => {};
    styles?: {
        text?: TextStyle;
        button?: ViewStyle;
    };
}

const ButtonComponent = (props: ButtonProps) => {
    // Get our props
    const {
        size,
        emphasis,
        text,
        type,
        state,
        fullWidth,
        iconLeft,
        iconRight,
        onPress,
        onLongPress,
        styles,
    } = props;

    const theme = useTheme();

    const buttonStyles = [
        buttonStyleCollection.default,
        buttonStyleCollection[size ?? 'm'],
        fullWidth && buttonStyleCollection.fullWidth,
        styles?.button,
    ];
    const textStyles = [
        textStyleCollection.default,
        textStyleCollection[size ?? 'm'],
        {color: textColor(theme, emphasis ?? 'primary', type ?? 'default')},
        styles?.text,
    ];

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={type === 'disabled'}
        >
            <Background
                theme={theme}
                emphasis={emphasis ?? 'primary'}
                type={type ?? 'default'}
                state={state ?? 'default'}
                styles={buttonStyles}
            >
                {iconLeft &&
                    <CompassIcon
                        style={textStyles as StyleProp<TextStyle>}
                        name={iconLeft}
                    />
                }
                <Text style={textStyles}>{text}</Text>
                {iconRight &&
                    <CompassIcon
                        style={textStyles as StyleProp<TextStyle>}
                        name={iconRight}
                    />
                }
            </Background>
        </Pressable>
    );
};

export default ButtonComponent;
