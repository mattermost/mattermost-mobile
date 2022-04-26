// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TextStyle, TouchableHighlight, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type OptionBoxProps = {
    iconColor?: string;
    iconName: string;
    onPress: () => void;
    text: string;
    textStyle?: TextStyle;
    style?: ViewStyle;
    underlayColor?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 4,
        flex: 1,
        maxHeight: 60,
        justifyContent: 'center',
        minWidth: 115,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        paddingHorizontal: 5,
        ...typography('Body', 50, 'SemiBold'),
    },
}));

const OptionBox = ({iconColor, iconName, onPress, style, text, textStyle, underlayColor}: OptionBoxProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <TouchableHighlight
            onPress={onPress}
            style={[styles.container, style]}
            underlayColor={changeOpacity(theme.centerChannelColor, 0.32) || underlayColor}
        >
            <>
                <CompassIcon
                    color={iconColor || changeOpacity(theme.centerChannelColor, 0.56)}
                    name={iconName}
                    size={24}
                />
                <Text
                    numberOfLines={1}
                    style={[styles.text, textStyle]}
                >
                    {text}
                </Text>
            </>
        </TouchableHighlight>
    );
};

export default OptionBox;
