// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type GestureResponderEvent, Platform, Text, useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        buttonContainer: {
            paddingHorizontal: 20,
        },
        container: {
            backgroundColor: theme.centerChannelBg,
        },
        iconContainer: {
            width: 24,
            height: 24,
            top: -1,
            marginRight: 4,
        },
        separator: {
            height: 1,
            right: 20,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: 20,
        },
    };
});

export const BUTTON_HEIGHT = 101;

function BottomSheetButton({disabled = false, onPress, icon, testID, text}: Props) {
    const theme = useTheme();
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const separatorWidth = Math.max(dimensions.width, 450);
    const buttonType = disabled ? 'disabled' : 'default';
    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

    const iconColor = disabled ? changeOpacity(theme.centerChannelColor, 0.32) : theme.buttonColor;

    return (
        <View style={styles.container}>
            <View style={[styles.separator, {width: separatorWidth}]}/>
            <View style={styles.buttonContainer}>
                <TouchableWithFeedback
                    onPress={onPress}
                    type='opacity'
                    style={[styles.button, styleButtonBackground]}
                    testID={testID}
                >
                    {icon && (
                        <View style={styles.iconContainer}>
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
                <View style={{paddingBottom: Platform.select({ios: (isTablet ? 20 : 32), android: 20})}}/>
            </View>
        </View>
    );
}

export default BottomSheetButton;
