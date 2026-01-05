// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
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
            paddingHorizontal: 16,
            justifyContent: 'center',
        },
        buttonText: {
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 16,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

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
    const intl = useIntl();

    const handleStop = usePreventDoubleTap(onStop);

    const handleRegenerate = usePreventDoubleTap(useCallback(() => {
        Alert.alert(
            intl.formatMessage({
                id: 'agents.regenerate.confirm_title',
                defaultMessage: 'Regenerate Response',
            }),
            intl.formatMessage({
                id: 'agents.regenerate.confirm_message',
                defaultMessage: 'This will clear the current response and generate a new one. Continue?',
            }),
            [
                {
                    text: intl.formatMessage({
                        id: 'agents.regenerate.cancel',
                        defaultMessage: 'Cancel',
                    }),
                    style: 'cancel',
                },
                {
                    text: intl.formatMessage({
                        id: 'agents.regenerate.confirm',
                        defaultMessage: 'Regenerate',
                    }),
                    onPress: onRegenerate,
                    style: 'destructive',
                },
            ],
        );
    }, [intl, onRegenerate]));

    return (
        <View style={styles.container}>
            {showStopButton && (
                <TouchableOpacity
                    onPress={handleStop}
                    style={styles.button}
                    activeOpacity={0.7}
                    testID='agents.controls_bar.stop_button'
                >
                    <CompassIcon
                        name='close-circle-outline'
                        size={12}
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
                    onPress={handleRegenerate}
                    style={styles.button}
                    activeOpacity={0.7}
                    testID='agents.controls_bar.regenerate_button'
                >
                    <CompassIcon
                        name='refresh'
                        size={12}
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

export default ControlsBar;
