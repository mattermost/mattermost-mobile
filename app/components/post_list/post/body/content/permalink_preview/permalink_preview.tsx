// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useMemo, useCallback, useEffect, useState} from 'react';
import {Text, View, Pressable, type LayoutChangeEvent, useWindowDimensions} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import EditedIndicator from '@components/edited_indicator';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Markdown from '@components/markdown';
import ProfilePicture from '@components/profile_picture';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useUserLocale} from '@context/user_locale';
import {usePreventDoubleTap} from '@hooks/utils';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserTimezone} from '@utils/user';

import Opengraph from '../opengraph';

import PermalinkFiles from './permalink_files';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {UserMentionKey} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

const MAX_PERMALINK_PREVIEW_LINES = 4;
const SHOW_MORE_HEIGHT = 54;
const EDITED_INDICATOR_CONTEXT = ['paragraph'];
const EMPTY_MENTION_KEYS: UserMentionKey[] = [];

type PermalinkPreviewProps = {
    embedData: PermalinkEmbedData;
    author?: UserModel;
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    teammateNameDisplay: string;
    post?: PostModel;
    isOriginPostDeleted?: boolean;
    location: AvailableScreens;
    parentLocation?: string;
    parentPostId?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderWidth: 1,
            borderRadius: 4,
            marginTop: 8,
            marginBottom: 8,
            padding: 12,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 1,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        authorInfo: {
            flex: 1,
            marginLeft: 12,
            flexDirection: 'row',
            alignItems: 'center',
        },
        authorName: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        timestamp: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
            marginLeft: 8,
        },
        messageContainer: {
            marginBottom: 8,
            maxHeight: 20 * MAX_PERMALINK_PREVIEW_LINES,
            overflow: 'hidden',
        },
        messageText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
            lineHeight: 20,
        },

        channelContext: {
            marginTop: 4,
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        channelName: {
            color: theme.linkColor,
            ...typography('Body', 75, 'SemiBold'),
        },
        contentContainer: {
            overflow: 'hidden',
            position: 'relative',
        },
        gradientOverlay: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
        },
    };
});

const PermalinkPreview = ({
    embedData,
    author,
    currentUser,
    isMilitaryTime,
    teammateNameDisplay,
    post,
    isOriginPostDeleted,
    location,
    parentLocation,
    parentPostId,
}: PermalinkPreviewProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const locale = useUserLocale();
    const dimensions = useWindowDimensions();
    const styles = getStyleSheet(theme);
    const [showGradient, setShowGradient] = useState(false);

    const maxPermalinkHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);

    const textStyles = getMarkdownTextStyles(theme);
    const blockStyles = getMarkdownBlockStyles(theme);

    const userId = embedData?.post?.user_id;

    useEffect(() => {
        if (userId && !author) {
            fetchUsersByIds(serverUrl, [userId], false);
        }
    }, [userId, author, serverUrl]);

    if (isOriginPostDeleted) {
        return null;
    }

    const {
        post: embedPost,
        channel_display_name,
        channel_type,
    } = embedData;

    const truncatedMessage = useMemo(() => {
        const message = embedPost?.message;

        if (!message || typeof message !== 'string') {
            return '';
        }

        const cleanMessage = message.trim();
        const lines = cleanMessage.split('\n');
        if (lines.length > MAX_PERMALINK_PREVIEW_LINES) {
            return lines.slice(0, MAX_PERMALINK_PREVIEW_LINES).join('\n...');
        }

        return cleanMessage;
    }, [embedPost?.message]);

    const isEdited = useMemo(() => embedData && embedData.post && embedData.post.edit_at > 0, [embedData]);

    const authorDisplayName = useMemo(() => {
        return displayUsername(author, locale, teammateNameDisplay);
    }, [author, locale, teammateNameDisplay]);

    const channelContextText = useMemo(() => {
        const displayName = channel_type === 'D' ? authorDisplayName : channel_display_name;
        return `~${displayName}`;
    }, [channel_display_name, channel_type, authorDisplayName]);

    const filesInfo = useMemo(() => {
        return embedData?.post?.metadata?.files || [];
    }, [embedData?.post?.metadata?.files]);

    const hasFiles = filesInfo && filesInfo.length > 0;

    const handlePress = usePreventDoubleTap(useCallback(() => {
        // Navigation will be implemented in Task 5
    }, []));

    const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        setShowGradient(height >= maxPermalinkHeight);
    }, [maxPermalinkHeight]);

    if (!post) {
        return null;
    }

    return (
        <Pressable
            style={({pressed}) => [
                styles.container,
                {opacity: pressed ? 0.8 : 1},
            ]}
            onPress={handlePress}
            testID='permalink-preview-container'
        >
            <View style={[styles.contentContainer, {maxHeight: maxPermalinkHeight}]}>
                <View onLayout={handleContentLayout}>
                    <View style={styles.header}>
                        <ProfilePicture
                            author={author}
                            size={32}
                            showStatus={false}
                        />
                        <View style={styles.authorInfo}>
                            <Text
                                style={styles.authorName}
                                numberOfLines={1}
                            >
                                {authorDisplayName}
                            </Text>
                            <FormattedTime
                                timezone={getUserTimezone(currentUser)}
                                isMilitaryTime={isMilitaryTime}
                                value={embedPost.create_at}
                                style={styles.timestamp}
                            />
                        </View>
                    </View>

                    <View style={styles.messageContainer}>
                        <Markdown
                            baseTextStyle={styles.messageText}
                            blockStyles={blockStyles}
                            channelId={embedData.channel_id}
                            disableAtMentions={false}
                            location={location}
                            theme={theme}
                            textStyles={textStyles}
                            value={truncatedMessage}
                            mentionKeys={currentUser?.mentionKeys ?? EMPTY_MENTION_KEYS}
                        />
                        {isEdited ? (
                            <EditedIndicator
                                baseTextStyle={styles.messageText}
                                theme={theme}
                                context={EDITED_INDICATOR_CONTEXT}
                                iconSize={12}
                                testID='permalink_preview.edited_indicator_separate'
                            />
                        ) : null}
                    </View>

                    <Opengraph
                        isReplyPost={false}
                        removeLinkPreview={false}
                        location={location}
                        metadata={embedData?.post?.metadata || null}
                        postId={embedData?.post?.id || ''}
                        theme={theme}
                        isEmbedded={true}
                    />

                    {hasFiles && post && (
                        <PermalinkFiles
                            post={post}
                            location='permalink_preview'
                            isReplyPost={false}
                            parentLocation={parentLocation}
                            parentPostId={parentPostId}
                        />
                    )}
                </View>

                {showGradient && (
                    <LinearGradient
                        colors={[changeOpacity(theme.centerChannelBg, 0), theme.centerChannelBg]}
                        style={styles.gradientOverlay}
                        pointerEvents='none'
                    />
                )}
            </View>

            <Text style={styles.channelContext}>
                <FormattedText
                    id='mobile.permalink_preview.originally_posted'
                    defaultMessage='Originally posted in '
                    style={styles.channelContext}
                />
                <Text style={styles.channelName}>
                    {channelContextText}
                </Text>
            </Text>
        </Pressable>
    );
};

export default PermalinkPreview;
