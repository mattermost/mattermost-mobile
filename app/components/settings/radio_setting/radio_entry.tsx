// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
        },
        rowContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 45,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        checkmark: {
            fontSize: 12,
            color: theme.linkColor,
        },
        text: {
            fontSize: 12,
            color: theme.centerChannelColor,
        },
    };
});

type Props = {
    handleChange: (value: string) => void;
    value: string;
    text: string;
    isLast: boolean;
    isSelected: boolean;
}
function RadioEntry({
    handleChange,
    value,
    text,
    isLast,
    isSelected,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const onPress = useCallback(() => {
        handleChange(value);
    }, [handleChange, value]);

    return (
        <TouchableOpacity
            onPress={onPress}
            key={value}
        >
            <View style={style.container}>
                <View style={style.rowContainer}>
                    <Text style={style.text}>{text}</Text>
                </View>
                {isSelected && (
                    <CompassIcon
                        name='check'
                        style={style.checkmark}
                    />
                )}
            </View>
            {!isLast && (
                <View style={style.separator}/>
            )}
        </TouchableOpacity>
    );
}

export default RadioEntry;
