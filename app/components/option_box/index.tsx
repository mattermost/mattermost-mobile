// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, type PressableStateCallbackType, type StyleProp, Text, type ViewStyle} from 'react-native';

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
    destructiveIconName?: string;
    destructiveText?: string;
    isDestructive?: boolean;
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
        minWidth: 60,
    },
    destructiveContainer: {
        backgroundColor: changeOpacity(theme.dndIndicator, 0.04),
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingHorizontal: 5,
        width: '100%',
        textAlign: 'center',
        ...typography('Body', 50, 'SemiBold'),
    },
}));

const OptionBox = ({
    activeIconName,
    activeText,
    containerStyle,
    iconName,
    isActive,
    onPress,
    testID,
    text,
    destructiveIconName,
    destructiveText,
    isDestructive,
}: OptionBoxProps) => {
    const theme = useTheme();
    const [activated, setActivated] = useState(isActive);
    const styles = getStyleSheet(theme);

    const pressedStyle = useCallback(({pressed}: PressableStateCallbackType) => {
        const style = [styles.container, containerStyle, isDestructive && styles.destructiveContainer];
        const baseBgColor = isDestructive ? theme.dndIndicator : theme.buttonBg;

        if (activated) {
            style.push({
                backgroundColor: changeOpacity(baseBgColor, 0.08),
            });
        }

        if (pressed) {
            style.push({
                backgroundColor: changeOpacity(baseBgColor, 0.16),
            });
        }

        return style;
    }, [activated, containerStyle, theme, isDestructive]);

    const handleOnPress = useCallback(() => {
        if (activeIconName || activeText) {
            setActivated(!activated);
        }
        onPress();
    }, [activated, activeIconName, activeText, onPress]);

    useEffect(() => {
        setActivated(isActive);
    }, [isActive]);

    const destructIconName = (isDestructive && destructiveIconName) ? destructiveIconName : undefined;
    const destructColor = isDestructive ? theme.dndIndicator : undefined;
    const destructText = (isDestructive && destructiveText) ? destructiveText : undefined;

    return (
        <Pressable
            onPress={handleOnPress}
            style={pressedStyle}
            testID={testID}
        >
            {({pressed}) => (
                <>
                    <CompassIcon
                        color={destructColor || ((pressed || activated) ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56))}
                        name={destructIconName || (activated && activeIconName ? activeIconName : iconName)}
                        size={24}
                    />
                    <Text
                        numberOfLines={1}
                        style={[styles.text, {color: destructColor || ((pressed || activated) ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.56))}]}
                        testID={`${testID}.label`}
                    >
                        {destructText || (activated && activeText ? activeText : text)}
                    </Text>
                </>
            )}
        </Pressable>
    );
};

export default OptionBox;
