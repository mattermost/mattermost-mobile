// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';

import {useTheme} from '@context/theme';
import {getMentionRanges} from '@utils/mention_utils';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    text: string;
    cursorPosition: number;
    users?: UserModel[];
    channelId?: string;
    currentUserId?: string;
};

/**
 * Enhanced MentionOverlay that shows full names over username mentions in the input area
 * Similar to the web app implementation from PR #31546
 */
const EnhancedMentionOverlay = ({text, cursorPosition, users = [], channelId, currentUserId}: Props) => {
    // All hooks must be called before any conditional returns
    const theme = useTheme();

    const mentionRanges = useMemo(() => {
        if (!text) {
            return [];
        }
        try {
            return getMentionRanges(text);
        } catch (error) {
            console.warn('Error getting mention ranges:', error);
            return [];
        }
    }, [text]);

    const styles = useMemo(() => getStyleSheet(theme), [theme]);

    // Create a user lookup map by username for efficient access
    const usersByUsername = useMemo(() => {
        const map = new Map<string, UserModel>();
        users.forEach((user) => {
            if (user.username) {
                map.set(user.username, user);
            }
        });
        return map;
    }, [users]);

    // Don't render if no text or mentions - moved after all hooks
    if (!text || mentionRanges.length === 0) {
        return null;
    }

    const renderTextWithMentions = () => {
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        mentionRanges.forEach((range, index) => {
            // Add invisible text before mention to maintain spacing
            if (range.start > lastIndex) {
                const beforeText = text.substring(lastIndex, range.start);
                elements.push(
                    <Text
                        key={`text-${index}`}
                        style={styles.invisibleText}
                    >
                        {beforeText}
                    </Text>,
                );
            }

            // Extract username from mention (remove @)
            const mentionText = text.substring(range.start, range.end);
            const username = mentionText.substring(1);

            // Look up user info
            const user = usersByUsername.get(username);
            let displayName = username; // fallback to username

            if (user) {
                // Use full name if available (UserModel uses firstName/lastName)
                if (user.firstName && user.lastName) {
                    displayName = `${user.firstName} ${user.lastName}`;
                } else if (user.nickname) {
                    displayName = user.nickname;
                } else {
                    displayName = username;
                }
            } else {
                // If no user info available, show placeholder that suggests full name would appear
                displayName = `${username} (Full Name)`;
            }

            elements.push(
                <Text
                    key={`mention-${index}`}
                    style={styles.mention}
                >
                    {displayName}
                </Text>,
            );

            lastIndex = range.end;
        });

        // Add invisible text after last mention
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            elements.push(
                <Text
                    key='text-end'
                    style={styles.invisibleText}
                >
                    {remainingText}
                </Text>,
            );
        }

        return elements;
    };

    return (
        <View
            style={styles.overlay}
            pointerEvents='none'
        >
            <View style={styles.textContainer}>
                {renderTextWithMentions()}
            </View>
        </View>
    );
};

const getStyleSheet = (theme: {mentionHighlightBg: string; mentionHighlightLink: string}) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
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
    },
    invisibleText: {
        color: 'transparent',
        fontSize: 15,
        lineHeight: 20,
        fontFamily: 'System', // Match input font
    },
    mention: {
        backgroundColor: theme.mentionHighlightBg,
        borderRadius: 3,
        paddingHorizontal: 2,
        fontSize: 15,
        lineHeight: 20,
        color: theme.mentionHighlightLink,
        fontFamily: 'System', // Match input font
        fontWeight: '400',
    },
});

export default EnhancedMentionOverlay;
