// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import {Animated, Platform, type StyleProp, StyleSheet, type TextStyle} from 'react-native';

import {useTheme} from '@context/theme';

type Props = {
    backgroundColor?: string;
    borderColor?: string;
    color?: string;
    style?: Animated.WithAnimatedValue<StyleProp<TextStyle>>;
    testID?: string;
    type?: 'Normal' | 'Small';

    /**
     * Value of the `Badge` for unread dot use a negative value.
     */
    value: number;
    visible: boolean;
};

export default function Badge({
    borderColor,
    color,
    visible = true,
    type = 'Normal',
    value,
    style,
    testID,
    ...rest
}: Props) {
    const [opacity] = React.useState(() => new Animated.Value(visible ? 1 : 0));
    const [rendered, setRendered] = React.useState(Boolean(visible));

    const theme = useTheme();

    React.useEffect(() => {
        if (!rendered) {
            return;
        }

        Animated.timing(opacity, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start(({finished}) => {
            if (finished && !visible) {
                setRendered(false);
            }
        });
    }, [opacity, rendered, visible]);

    if (visible && !rendered) {
        setRendered(true);
    }

    if (!visible && !rendered) {
        return null;
    }

    // @ts-expect-error: backgroundColor definitely exists
    const {backgroundColor = rest.backgroundColor || theme.mentionBg, ...restStyle} =
    StyleSheet.flatten(style) || {};
    const textColor = color || theme.mentionColor;
    let lineHeight = Platform.select({android: 21, ios: 16.5});
    let fontSize = 12;
    let size = value < 0 ? 12 : 22;
    let minWidth = value < 0 ? size : 26;
    let additionalStyle;
    if (type === 'Small') {
        size = value < 0 ? 12 : 20;
        lineHeight = Platform.select({android: 19, ios: 15});
        fontSize = 11;
        minWidth = value < 0 ? size : 24;
    }
    const borderRadius = size / 2;

    let badge: string = value?.toString();
    if (value < 0) {
        badge = '';
        additionalStyle = {paddingHorizontal: 0};
    } else if (value < 99) {
        badge = value.toString();
        additionalStyle = {paddingHorizontal: 5};
    } else {
        badge = '99+';
        additionalStyle = {paddingLeft: 4, paddingRight: 3};
    }

    return (
        <Animated.Text
            numberOfLines={1}
            style={[
                {
                    opacity,
                    transform: [
                        {
                            scale: opacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1],
                            }),
                        },
                    ],
                    borderColor,
                    backgroundColor,
                    color: textColor,
                    fontSize,
                    lineHeight,
                    minWidth,
                    height: size,
                    borderRadius,
                },
                styles.container,
                additionalStyle,
                restStyle,
            ]}
            testID={testID}
            {...rest}
        >
            {badge}
        </Animated.Text>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: -1,
        left: 15,
        alignSelf: 'flex-end',
        textAlign: 'center',
        paddingHorizontal: 4,
        overflow: 'hidden',
        borderWidth: 2,
        fontFamily: 'OpenSans-Bold',
    },
});
