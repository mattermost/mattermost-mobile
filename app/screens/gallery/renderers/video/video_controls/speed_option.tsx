// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {typography} from '@utils/typography';

interface SpeedOptionProps {
    rate: number;
    onSpeedChange: (rate: number) => void;
    isSelected: boolean;
}

const styles = StyleSheet.create({
    iosOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    iosOptionText: {
        color: 'white',
        ...typography('Body', 100),
    },
    iosCheck: {
        color: '#007AFF',
        ...typography('Body', 100, 'SemiBold'),
    },
    androidOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    androidActiveOption: {
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
    },
    androidOptionText: {
        color: 'white',
        ...typography('Body', 100),
        textAlign: 'center',
    },
    androidActiveText: {
        color: '#1976D2',
        ...typography('Body', 100, 'SemiBold'),
    },
});

const SpeedOption: React.FC<SpeedOptionProps> = ({rate, onSpeedChange, isSelected}) => {
    const handleSpeedSelect = useCallback(() => {
        onSpeedChange(rate);
    }, [onSpeedChange, rate]);

    let rateValue;
    let optionStyle: StyleProp<ViewStyle> = styles.iosOption;
    if (Platform.OS === 'android') {
        optionStyle = [styles.androidOption];
        if (isSelected) {
            optionStyle.push(styles.androidActiveOption);
        }
        rateValue = (
            <Text
                style={[
                    styles.androidOptionText,
                    isSelected && styles.androidActiveText,
                ]}
            >
                {rate === 1 ? '1×' : `${rate}×`}
            </Text>
        );
    } else if (rate === 1) {
        rateValue = (
            <>
                <FormattedText
                    id='video.normal'
                    defaultMessage='Normal'
                    style={styles.iosOptionText}
                />
                {isSelected && (
                    <Text style={styles.iosCheck}>{'✓'}</Text>
                )}
            </>
        );
    } else {
        rateValue = (
            <>
                <Text style={styles.iosOptionText}>
                    {`${rate}×`}
                </Text>
                {isSelected && (
                    <Text style={styles.iosCheck}>{'✓'}</Text>
                )}
            </>
        );
    }

    return (
        <Pressable
            style={optionStyle}
            onPress={handleSpeedSelect}
        >
            {rateValue}
        </Pressable>
    );
};

export default SpeedOption;
