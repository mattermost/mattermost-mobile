// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';

import {backgroundStyle, textColor} from './helper';

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
 * @param props
 * @returns
 */
const Background = (props: BackgroundProps) => {
    const {theme, emphasis, type, state, children, styles} = props;

    if (['active', 'hover'].includes(state) && Array.isArray(backgroundStyle(theme)[emphasis][type][state])) {
        return (<LinearGradient colors={backgroundStyle(theme)[emphasis][type][state] as string[]}>
            {children}
        </LinearGradient>);
    }

    return (
        <View style={[backgroundStyle(theme)[emphasis][type][state], styles]}>
            {children}
        </View>
    );
};

// Various Text Styles (Size, fonts / weights, decoration)
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

// Various button styles; sizes and defaults
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

/**
 * This component adheres to the Mattermost Button Component UI library
 *
 * https://www.figma.com/file/2uYWxjnMJ9IQDOba9b9bfV/Components---Buttons?node-id=1%3A184
 *
 * @param props
 * @returns
 */
const Button = (props: ButtonProps) => {
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

export default Button;
