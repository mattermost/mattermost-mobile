// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

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
        pressed: {
            opacity: 0.72,
        },
        checkmark: {
            fontSize: 12,
            color: theme.linkColor,
        },
        text: {
            ...typography('Body', 75, 'Regular'),
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
    testID?: string;
    labelPosition?: 'before' | 'after';
}
function RadioEntry({
    handleChange,
    value,
    text,
    isLast,
    isSelected,
    testID,
    labelPosition,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const onPress = useCallback(() => {
        handleChange(value);
    }, [handleChange, value]);

    const textEl = (
        <View style={style.rowContainer}>
            <Text style={style.text}>{text}</Text>
        </View>
    );
    const checkmarkEl = isSelected && (
        <CompassIcon
            name='check'
            style={style.checkmark}
        />
    );

    return (
        <Pressable
            onPress={onPress}
            testID={testID}
            style={({pressed}) => [pressed && style.pressed]}
        >
            <View style={style.container}>
                {labelPosition === 'after' ? (
                    <>
                        {checkmarkEl}
                        {textEl}
                    </>
                ) : (
                    <>
                        {textEl}
                        {checkmarkEl}
                    </>
                )}
            </View>
            {!isLast && (
                <View style={style.separator}/>
            )}
        </Pressable>
    );
}

export default RadioEntry;
