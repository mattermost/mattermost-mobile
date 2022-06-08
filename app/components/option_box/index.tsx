// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, PressableStateCallbackType, StyleProp, Text, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type OptionBoxProps = {
    activeIconName?: string;
    activeText?: string;
    containerStyle?: StyleProp<ViewStyle>;
    iconName: string;
    isActive?: boolean;
    onPress: () => void;
    testID?: string;
    text: string;
}

export const OPTIONS_HEIGHT = 62;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 4,
        flex: 1,
        maxHeight: OPTIONS_HEIGHT,
        justifyContent: 'center',
        minWidth: 80,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingHorizontal: 5,
        ...typography('Body', 50, 'SemiBold'),
    },
}));

const OptionBox = ({activeIconName, activeText, containerStyle, iconName, isActive, onPress, testID, text}: OptionBoxProps) => {
    const theme = useTheme();
    const [activated, setActivated] = useState(isActive);
    const styles = getStyleSheet(theme);
    const pressedStyle = useCallback(({pressed}: PressableStateCallbackType) => {
        const style = [styles.container, Boolean(containerStyle) && containerStyle];

        if (activated) {
            style.push({
                backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            });
        }

        if (pressed) {
            style.push({
                backgroundColor: changeOpacity(theme.buttonBg, 0.16),
            });
        }

        return style;
    }, [activated, containerStyle, theme]);

    const handleOnPress = useCallback(() => {
        if (activeIconName || activeText) {
            setActivated(!activated);
        }
        onPress();
    }, [activated, activeIconName, activeText, onPress]);

    useEffect(() => {
        setActivated(isActive);
    }, [isActive]);

    return (
        <Pressable
            onPress={handleOnPress}
            style={pressedStyle}
            testID={testID}
        >
            {({pressed}) => (
                <>
                    <CompassIcon
                        color={(pressed || activated) ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56)}
                        name={activated && activeIconName ? activeIconName : iconName}
                        size={24}
                    />
                    <Text
                        numberOfLines={1}
                        style={[styles.text, {color: (pressed || activated) ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56)}]}
                        testID={`${testID}.label`}
                    >
                        {activated && activeText ? activeText : text}
                    </Text>
                </>
            )}
        </Pressable>
    );
};

export default OptionBox;
