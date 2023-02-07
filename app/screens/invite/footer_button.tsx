// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, StyleProp, ViewStyle, TextStyle} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        summaryButtonTextContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 24,
        },
        summaryButtonIcon: {
            marginRight: 7,
            color: theme.buttonColor,

        },
    };
});

type FooterButtonProps = {
    text: string;
    textStyle?: StyleProp<TextStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    iconName?: string;
    iconStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    testID?: string;
    onPress: () => void;
}

export default function FooterButton({
    text,
    textStyle,
    containerStyle,
    iconName,
    iconStyle,
    disabled,
    testID,
    onPress,
}: FooterButtonProps) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const type = disabled ? 'disabled' : 'default';
    const styleText = buttonTextStyle(theme, 'lg', 'primary', type);
    const styleBackground = buttonBackgroundStyle(theme, 'lg', 'primary', type);

    return (
        <Button
            containerStyle={[styleBackground, containerStyle, {flexGrow: 1}]}
            disabled={disabled}
            onPress={onPress}
            testID={`invite.footer_button.${testID}`}
        >
            <View style={styles.summaryButtonTextContainer}>
                {iconName && (
                    <CompassIcon
                        name={iconName}
                        size={24}
                        style={iconStyle}
                    />
                )}
                <Text style={[styleText, textStyle]}>
                    {text}
                </Text>
            </View>
        </Button>
    );
}
