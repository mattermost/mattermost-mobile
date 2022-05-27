// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {GestureResponderEvent, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    disabled?: boolean;
    onPress?: (e: GestureResponderEvent) => void;
    icon?: string;
    testID?: string;
    text?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            display: 'flex',
            flexDirection: 'row',
        },
        buttonDisabled: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        text: {
            ...typography('Body', 200, 'SemiBold'),
        },
        icon_container: {
            width: 24,
            height: 24,
            marginTop: 2,
        },
    };
});

export default function BottomSheetButton({disabled = false, onPress, icon, testID, text}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const buttonType = disabled ? 'disabled' : 'default';
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

    let iconColor = theme.buttonColor;
    if (disabled) {
        iconColor = styles.buttonDisabled.color;
    }

    return (
        <TouchableWithFeedback
            onPress={onPress}
            type='opacity'
            style={[styles.button, styleButtonText, styleButtonBackground]}
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
                    style={[styles.text, {color: iconColor}]}
                >{text}</Text>
            )}

        </TouchableWithFeedback>
    );
}
