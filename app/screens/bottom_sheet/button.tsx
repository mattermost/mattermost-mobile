// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {GestureResponderEvent, StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity} from '@utils/theme';

type Props = {
    disabled?: boolean;
    onPress?: (e: GestureResponderEvent) => void;
    icon?: string;
    testID?: string;
    text?: string;
}

const styles = StyleSheet.create({
    button: {
        display: 'flex',
        flexDirection: 'row',
    },
    icon_container: {
        width: 24,
        height: 24,
        marginTop: 2,
        marginRight: 8,
    },
});

export default function BottomSheetButton({disabled = false, onPress, icon, testID, text}: Props) {
    const theme = useTheme();

    const buttonType = disabled ? 'disabled' : 'default';
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

    const iconColor = disabled ? changeOpacity(theme.centerChannelColor, 0.32) : theme.buttonColor;

    return (
        <TouchableWithFeedback
            onPress={onPress}
            type='opacity'
            style={[styles.button, styleButtonBackground]}
            testID={testID}
        >
            {icon && (
                <View style={styles.icon_container}>
                    <CompassIcon
                        size={24}
                        name={icon}
                        color={iconColor}
                    />
                </View>
            )}
            {text && (
                <Text
                    style={styleButtonText}
                >{text}</Text>
            )}

        </TouchableWithFeedback>
    );
}
