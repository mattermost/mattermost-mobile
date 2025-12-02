// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {changeOpacity} from '@utils/theme';

type Props = {
    theme: Theme;
    onCancel: () => void;
};

/**
 * Simple processing overlay that matches the webapp style:
 * - Horizontal bar with loading indicator, "Rewriting" text, and stop button
 * - Semi-transparent background over the input area
 */
const ProcessingOverlay = ({theme, onCancel}: Props) => {
    const intl = useIntl();

    const styles = StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.92),
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
        processingBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        text: {
            fontSize: 14,
            fontWeight: '400',
            lineHeight: 20,
            color: theme.centerChannelColor,
        },
        stopButton: {
            marginLeft: 'auto',
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
        },
        stopButtonText: {
            fontSize: 14,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
    });

    return (
        <View style={styles.overlay}>
            <View style={styles.processingBar}>
                <ActivityIndicator
                    size='small'
                    color={theme.centerChannelColor}
                />
                <Text style={styles.text}>
                    {intl.formatMessage({
                        id: 'texteditor.rewrite.rewriting',
                        defaultMessage: 'Rewriting',
                    })}
                </Text>
                <TouchableOpacity
                    onPress={onCancel}
                    style={styles.stopButton}
                >
                    <Text style={styles.stopButtonText}>
                        {intl.formatMessage({
                            id: 'texteditor.rewrite.stopGenerating',
                            defaultMessage: 'Stop generating',
                        })}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ProcessingOverlay;

