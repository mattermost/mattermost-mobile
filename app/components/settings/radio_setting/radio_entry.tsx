// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const CHECKLIST_SIZE = 24;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
        },
        text: {
            flex: 1,
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
            marginLeft: 16,
        },
        checkmark: {
            color: theme.buttonBg,
        },
        checklistRing: {
            height: CHECKLIST_SIZE,
            width: CHECKLIST_SIZE,
            borderRadius: CHECKLIST_SIZE / 2,
            borderWidth: 2,
            borderColor: changeOpacity(theme.centerChannelColor, 0.32),
            alignItems: 'center',
            justifyContent: 'center',
        },
        checklistRingSelected: {
            borderColor: theme.buttonBg,
            backgroundColor: theme.buttonBg,
        },
    };
});

export type RadioEntryVariant = 'radio' | 'checklist';

type Props = {
    handleChange: (value: string) => void;
    value: string;
    text: string;
    isLast: boolean;
    isSelected: boolean;
    variant?: RadioEntryVariant;
    disabled?: boolean;
    testID?: string;
}

function RadioEntry({
    handleChange,
    value,
    text,
    isLast,
    isSelected,
    variant = 'radio',
    disabled = false,
    testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const onPress = useCallback(() => {
        handleChange(value);
    }, [handleChange, value]);

    let indicator = null;
    if (variant === 'checklist') {
        indicator = (
            <View style={[style.checklistRing, isSelected && style.checklistRingSelected]}>
                {isSelected && (
                    <CompassIcon
                        name='check'
                        size={14}
                        color={theme.buttonColor}
                    />
                )}
            </View>
        );
    } else if (isSelected) {
        indicator = (
            <CompassIcon
                name='check'
                size={24}
                style={style.checkmark}
            />
        );
    }

    return (
        <View>
            <TouchableWithFeedback
                disabled={disabled}
                onPress={onPress}
                type='opacity'
                testID={testID}
            >
                <View style={style.container}>
                    <Text style={style.text}>{text}</Text>
                    {indicator}
                </View>
            </TouchableWithFeedback>
            {!isLast && (
                <View style={style.separator}/>
            )}
        </View>
    );
}

export default RadioEntry;
