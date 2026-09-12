// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Pressable, Text, View} from 'react-native';

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
        pressed: {
            opacity: 0.72,
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
        text: {
            fontSize: 12,
            color: theme.centerChannelColor,
        },
        rowContainerAfter: {
            marginLeft: 8,
        },
        checkbox: {
            width: 20,
            height: 20,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        checkboxDisabled: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        checkedBox: {
            backgroundColor: theme.buttonBg,
            borderColor: theme.buttonBg,
        },
        checkedBoxDisabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        checkIcon: {
            color: theme.buttonColor,
            fontSize: 18,
        },
        disabledCheckIcon: {
            color: theme.centerChannelColor,
        },
    };
});

type Props = {
    handleChange: (value: string, checked: boolean) => void;
    value: string;
    text: string;
    isLast: boolean;
    isSelected: boolean;
    labelPosition?: 'before' | 'after';
    testID?: string;
    disabled?: boolean;
}

function CheckboxEntry({
    handleChange,
    value,
    text,
    isLast,
    isSelected,
    labelPosition,
    testID,
    disabled,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const onPress = useCallback(() => {
        handleChange(value, !isSelected);
    }, [handleChange, value, isSelected]);

    const checkboxStyle = [
        style.checkbox,
        isSelected && (disabled ? style.checkedBoxDisabled : style.checkedBox),
        disabled && style.checkboxDisabled,
    ];
    const iconStyle = [
        style.checkIcon,
        disabled && style.disabledCheckIcon,
    ];

    const textEl = (
        <View style={[style.rowContainer, labelPosition === 'after' && style.rowContainerAfter]}>
            <Text style={style.text}>{text}</Text>
        </View>
    );
    const checkboxEl = (
        <View style={checkboxStyle}>
            {isSelected && (
                <CompassIcon
                    name='check'
                    style={iconStyle}
                    testID={`${testID}.checked`}
                />
            )}
        </View>
    );

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({pressed}) => [pressed && style.pressed]}
            testID={testID}
        >
            <View style={style.container}>
                {labelPosition === 'after' ? (
                    <>
                        {checkboxEl}
                        {textEl}
                    </>
                ) : (
                    <>
                        {textEl}
                        {checkboxEl}
                    </>
                )}
            </View>
            {!isLast && (
                <View style={style.separator}/>
            )}
        </Pressable>
    );
}

export default CheckboxEntry;
