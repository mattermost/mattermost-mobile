// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, PressableStateCallbackType, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    applyMargin?: boolean;
    color?: string;
    iconName: string;
    label: string;
    onPress: () => void;
    testID?: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 4,
        height: 70,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: 112,
    },
    containerPressed: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
    },
    label: {
        marginTop: 6,
        ...typography('Body', 50, 'SemiBold'),
    },
    margin: {
        marginRight: 8,
    },
}));

const IntroItem = ({applyMargin, color, iconName, label, onPress, testID, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const pressedStyle = useCallback(({pressed}: PressableStateCallbackType) => {
        const style = [styles.container];
        if (pressed) {
            style.push(styles.containerPressed);
        }

        if (applyMargin) {
            style.push(styles.margin);
        }

        return style;
    }, [applyMargin, theme]);

    return (
        <Pressable
            onPress={onPress}
            style={pressedStyle}
            testID={testID}
        >
            {({pressed}) => (
                <>
                    <CompassIcon
                        name={iconName}
                        color={pressed ? theme.linkColor : color || changeOpacity(theme.centerChannelColor, 0.56)}
                        size={24}
                    />
                    <Text
                        style={[styles.label, {color: pressed ? theme.linkColor : color || changeOpacity(theme.centerChannelColor, 0.56)}]}
                        testID={`${testID}.label`}
                    >
                        {label}
                    </Text>
                </>
            )}
        </Pressable>
    );
};

export default IntroItem;
