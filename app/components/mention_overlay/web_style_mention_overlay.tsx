// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Platform, Animated} from 'react-native';

import {useTheme} from '@context/theme';
import {getMentionRanges} from '@utils/mention_utils';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    text: string;
    users?: UserModel[];
    cursorPosition?: number;
};

/**
 * Web-style Mention Overlay - Improved positioning and text flow
 * Creates a display text where mentions are replaced with full names
 * while maintaining proper text positioning
 */
const WebStyleMentionOverlay = ({
    text,
    users = [],
    cursorPosition = 0,
}: Props) => {
    const theme = useTheme();
    
    // Cursor blinking animation
    const blinkAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        // Reset animation value before starting
        blinkAnim.setValue(1);
        
        const blinkAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(blinkAnim, {
                    toValue: 0,
                    duration: 530,
                    useNativeDriver: true,
                }),
                Animated.timing(blinkAnim, {
                    toValue: 1,
                    duration: 530,
                    useNativeDriver: true,
                }),
            ])
        );
        
        blinkAnimation.start();
        
        return () => {
            blinkAnimation.stop();
            blinkAnim.setValue(1); // Reset value on cleanup
        };
    }, [text, cursorPosition]); // Add dependencies to restart animation
    
    // Create usersByUsername map
    const usersByUsername = useMemo(() => {
        const map = new Map<string, UserModel>();
        users.forEach(user => {
            if (user.username) {
                map.set(user.username, user);
            }
        });
        return map;
    }, [users]);

    // Get mention ranges
    const mentionRanges = useMemo(() => {
        return getMentionRanges(text);
    }, [text]);

    // Create display text with mentions replaced by full names
    const displayTextSegments = useMemo(() => {
        if (mentionRanges.length === 0) {
            return [{text, isMention: false}];
        }
        
        const segments: Array<{
            text: string;
            isMention: boolean;
            displayText?: string;
            originalLength?: number;
            displayLength?: number;
        }> = [];
        
        let lastIndex = 0;
        
        for (const range of mentionRanges) {
            // Add text before mention
            if (range.start > lastIndex) {
                segments.push({
                    text: text.substring(lastIndex, range.start),
                    isMention: false,
                });
            }
            
            // Process mention
            const mentionText = text.substring(range.start, range.end);
            const username = mentionText.substring(1); // Remove @
            const user = usersByUsername.get(username);
            
            if (user) {
                let displayText = username;
                if (user.firstName && user.lastName) {
                    displayText = `${user.firstName} ${user.lastName}`;
                } else if (user.nickname) {
                    displayText = user.nickname;
                }
                
                segments.push({
                    text: mentionText,
                    isMention: true,
                    displayText,
                    originalLength: mentionText.length,
                    displayLength: displayText.length,
                });
            } else {
                // User not found, keep original mention
                segments.push({
                    text: mentionText,
                    isMention: false,
                });
            }
            
            lastIndex = range.end;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
            segments.push({
                text: text.substring(lastIndex),
                isMention: false,
            });
        }
        
        return segments;
    }, [text, mentionRanges, usersByUsername]);

    // Create the complete display text for proper text flow
    const completeDisplayText = useMemo(() => {
        return displayTextSegments.map(segment => {
            if (segment.isMention && segment.displayText) {
                return segment.displayText;
            }
            return segment.text;
        }).join('');
    }, [displayTextSegments]);

    // Calculate cursor position in display text
    const displayCursorPosition = useMemo(() => {
        let originalPos = 0;
        let displayPos = 0;
        
        for (const segment of displayTextSegments) {
            const segmentOriginalLength = segment.originalLength || segment.text.length;
            const segmentDisplayLength = segment.displayLength || segment.text.length;
            
            if (originalPos + segmentOriginalLength >= cursorPosition) {
                // Cursor is within this segment
                const offsetInSegment = cursorPosition - originalPos;
                
                if (segment.isMention && segment.displayText) {
                    // For mentions, cursor should be at the end of the display text
                    if (offsetInSegment >= segmentOriginalLength) {
                        displayPos += segmentDisplayLength;
                    } else {
                        // Cursor is inside mention, place at end of mention
                        displayPos += segmentDisplayLength;
                    }
                } else {
                    // For normal text, maintain relative position
                    displayPos += offsetInSegment;
                }
                break;
            }
            
            originalPos += segmentOriginalLength;
            displayPos += segmentDisplayLength;
        }
        
        return displayPos;
    }, [displayTextSegments, cursorPosition]);

    const styles = getStyleSheet(theme);

    // Debug logging
    console.log('WebStyleMentionOverlay - Render');
    console.log('  Text:', text);
    console.log('  Cursor position:', cursorPosition);
    console.log('  Display cursor position:', displayCursorPosition);
    console.log('  Mention ranges:', mentionRanges);
    console.log('  Display text segments:', displayTextSegments);
    console.log('  Users count:', users.length);

    // Check if we have mentions to replace
    const hasMentions = displayTextSegments.some(segment => segment.isMention && segment.displayText);
    console.log('  Has mentions:', hasMentions);
    
    // Always show cursor, only hide if no text at all
    if (!text) {
        return null;
    }

    return (
        <View style={styles.overlay} pointerEvents="none">
            {hasMentions && (
                <>
                    {/* Background layer - hides original text */}
                    <Text style={[styles.overlayText, styles.backgroundText]}>
                        {text}
                    </Text>
                    
                    {/* Foreground layer - shows display text with mentions replaced */}
                    <Text style={[styles.overlayText, styles.foregroundText]}>
                        {displayTextSegments.map((segment, index) => {
                            if (segment.isMention && segment.displayText) {
                                return (
                                    <Text key={index} style={styles.mentionText}>
                                        {segment.displayText}
                                    </Text>
                                );
                            }
                            return (
                                <Text key={index} style={styles.normalText}>
                                    {segment.text}
                                </Text>
                            );
                        })}
                    </Text>
                </>
            )}
            
            {/* Cursor layer - always show cursor when there's text */}
            <View style={styles.cursorContainer}>
                <Text style={styles.invisibleText}>
                    {completeDisplayText.slice(0, displayCursorPosition)}
                </Text>
                <Animated.Text
                    style={[
                        styles.cursor,
                        {opacity: blinkAnim}
                    ]}
                >
                    |
                </Animated.Text>
            </View>
        </View>
    );
};

const getStyleSheet = (theme: {
    mentionHighlightBg: string;
    mentionHighlightLink: string;
    centerChannelBg: string;
    centerChannelColor: string;
}) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    overlayText: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        width: '100%',
        paddingHorizontal: 12,
        paddingTop: Platform.select({
            ios: 6,
            android: 8,
        }),
        paddingBottom: Platform.select({
            ios: 6,
            android: 2,
        }),
        includeFontPadding: false,
        textAlignVertical: 'top',
    },
    backgroundText: {
        color: theme.centerChannelBg, // Hide original text by matching background
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    foregroundText: {
        color: 'transparent', // Base text transparent
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
    },
    normalText: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        color: theme.centerChannelColor,
    },
    mentionText: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        color: theme.mentionHighlightLink,
        backgroundColor: theme.mentionHighlightBg,
        paddingHorizontal: 2,
        borderRadius: 3,
    },
    cursorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        flexDirection: 'row',
        flexWrap: 'wrap',
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        paddingHorizontal: 12,
        paddingTop: Platform.select({
            ios: 6,
            android: 8,
        }),
        paddingBottom: Platform.select({
            ios: 6,
            android: 2,
        }),
        includeFontPadding: false,
        textAlignVertical: 'top',
    },
    cursor: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        color: theme.centerChannelColor,
        backgroundColor: 'transparent',
    },
    invisibleText: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
        }),
        color: 'transparent',
        backgroundColor: 'transparent',
    },
});

export default WebStyleMentionOverlay;