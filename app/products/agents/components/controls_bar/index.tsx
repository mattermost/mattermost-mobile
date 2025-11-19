// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface ControlsBarProps {
    showStopButton: boolean;
    showRegenerateButton: boolean;
    onStop: () => void;
    onRegenerate: () => void;
}

/**
 * Controls bar for agent posts with stop and regenerate buttons
 */
const ControlsBar = ({
    showStopButton,
    showRegenerateButton,
    onStop,
    onRegenerate,
}: ControlsBarProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleRegenerate = useCallback(() => {
        Alert.alert(
            'Regenerate Response',
            'This will clear the current response and generate a new one. Continue?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Regenerate',
                    onPress: onRegenerate,
                    style: 'destructive',
                },
            ],
        );
    }, [onRegenerate]);

    if (!showStopButton && !showRegenerateButton) {
        return null;
    }

    return (
        <View style={styles.container}>
            {showStopButton && (
                <TouchableOpacity
                    onPress={preventDoubleTap(onStop)}
                    style={[styles.button, styles.stopButton]}
                    activeOpacity={0.7}
                    testID='agents.controls_bar.stop_button'
                >
                    <CompassIcon
                        name='close-circle-outline'
                        size={14}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.controls.stop'
                        defaultMessage='Stop Generating'
                        style={styles.buttonText}
                    />
                </TouchableOpacity>
            )}
            {showRegenerateButton && (
                <TouchableOpacity
                    onPress={preventDoubleTap(handleRegenerate)}
                    style={styles.button}
                    activeOpacity={0.7}
                    testID='agents.controls_bar.regenerate_button'
                >
                    <CompassIcon
                        name='refresh'
                        size={14}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                    <FormattedText
                        id='agents.controls.regenerate'
                        defaultMessage='Regenerate'
                        style={styles.buttonText}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 8,
        },
        button: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 10,
            minHeight: 44, // Touch-optimized height
            justifyContent: 'center',
        },
        stopButton: {

            // Specific styling for stop button if needed
        },
        buttonText: {
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    });
});

export default ControlsBar;
