// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';

import {useTheme} from '@context/theme';
import {getMentionRanges} from '@utils/mention_utils';

type Props = {
    text: string;
    cursorPosition: number;
};

const MentionOverlay = ({text, cursorPosition}: Props) => {
    const theme = useTheme();

    if (!text) {
        return null;
    }

    const mentionRanges = getMentionRanges(text);

    if (mentionRanges.length === 0) {
        return null;
    }

    const styles = getStyleSheet(theme);

    // Split text and render with mention overlays
    const renderTextWithMentions = () => {
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        mentionRanges.forEach((range, index) => {
            // Add text before mention
            if (range.start > lastIndex) {
                const beforeText = text.substring(lastIndex, range.start);
                elements.push(
                    <Text key={`text-${index}`} style={styles.invisibleText}>
                        {beforeText}
                    </Text>
                );
            }

            // Add mention overlay with full name display
            const mentionText = text.substring(range.start, range.end);
            const username = mentionText.substring(1); // Remove @ symbol
            
            // For now, show a placeholder full name - this would be replaced with actual user lookup
            const fullName = `Full Name (${username})`;
            
            elements.push(
                <Text key={`mention-${index}`} style={styles.mention}>
                    {fullName}
                </Text>
            );

            lastIndex = range.end;
        });

        // Add remaining text
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            elements.push(
                <Text key="text-end" style={styles.invisibleText}>
                    {remainingText}
                </Text>
            );
        }

        return elements;
    };

    return (
        <View style={styles.overlay} pointerEvents="none">
            <View style={styles.textContainer}>
                {renderTextWithMentions()}
            </View>
        </View>
    );
};

const getStyleSheet = (theme: Theme) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    textContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingTop: Platform.select({
            ios: 6,
            android: 8,
        }),
        paddingBottom: Platform.select({
            ios: 6,
            android: 2,
        }),
        minHeight: 30,
        fontSize: 15,
        lineHeight: 20,
    },
    invisibleText: {
        color: 'transparent',
        fontSize: 15,
        lineHeight: 20,
    },
    mention: {
        backgroundColor: theme.mentionHighlightBg,
        borderRadius: 3,
        paddingHorizontal: 2,
        fontSize: 15,
        lineHeight: 20,
        color: theme.mentionHighlightLink,
    },
});

export default MentionOverlay;
