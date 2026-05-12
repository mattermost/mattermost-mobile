// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useMemo, useCallback, useEffect, useState} from 'react';
import {Text, View, Pressable, type LayoutChangeEvent} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import {fetchPostById} from '@actions/remote/post';
import {fetchUsersByIds} from '@actions/remote/user';
import EditedIndicator from '@components/edited_indicator';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Markdown from '@components/markdown';
import RedactedFilesPlaceholder from '@components/post_list/post/body/redacted_files_placeholder';
import TranslateIcon from '@components/post_list/post/header/translate_icon';
import ProfilePicture from '@components/profile_picture';
import {View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useUserLocale} from '@context/user_locale';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {getPostTranslatedMessage, getPostTranslation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserTimezone} from '@utils/user';

import Opengraph from '../opengraph';

import PermalinkFiles from './permalink_files';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const MAX_PERMALINK_PREVIEW_CHARACTERS = 150;
const EDITED_INDICATOR_CONTEXT = ['paragraph'];
const MIN_PERMALINK_WIDTH = 340;
const TABLET_PADDING_OFFSET = 40;

type PermalinkPreviewProps = {
    embedData: PermalinkEmbedData;
    author?: UserModel;
    currentUser?: UserModel;
    hasLinkedPostFiles: boolean;
    isMilitaryTime: boolean;
    teammateNameDisplay: string;
    post?: PostModel;
    isOriginPostDeleted?: boolean;
    location: AvailableScreens;
    parentLocation?: string;
    parentPostId?: string;
    autotranslationsEnabled: boolean;
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
            gap: 8,
        },
        authorName: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        timestamp: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        messageContainer: {
            marginBottom: 8,
        },
        messageText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
            lineHeight: 20,
        },

        channelContext: {
            marginTop: 8,
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
    hasLinkedPostFiles,
    isMilitaryTime,
    teammateNameDisplay,
    post,
    isOriginPostDeleted,
    location,
    parentLocation,
    parentPostId,
    autotranslationsEnabled,
}: PermalinkPreviewProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const locale = useUserLocale();
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const [showGradient, setShowGradient] = useState(false);

    const maxWidth = useMemo(() => {
        if (!isTablet) {
            return undefined;
        }

        const deviceSize = Math.min(dimensions.width, dimensions.height);
        const availableWidth = deviceSize - ViewConstants.TABLET_SIDEBAR_WIDTH;

        return Math.max(availableWidth - TABLET_PADDING_OFFSET, MIN_PERMALINK_WIDTH);
    }, [dimensions.width, dimensions.height, isTablet]);

    const maxPermalinkHeight = Math.round(dimensions.height * 0.5);

    const userId = embedData?.post?.user_id;

    useEffect(() => {
        if (userId && !author) {
            fetchUsersByIds(serverUrl, [userId], false);
        }
    }, [userId, author, serverUrl]);

    const linkedPostId = embedData?.post_id;
    const embedFilesCount = embedData?.post?.metadata?.files?.length ?? 0;
    useEffect(() => {
        if (!linkedPostId) {
            return;
        }
        if (!post) {
            fetchPostById(serverUrl, linkedPostId);
            return;
        }

        // When the embed shows accessible files but DB records are missing (e.g. after ABAC
        // access is granted and file records were deleted during the denial period), re-fetch
        // the linked post so handlePosts repopulates the file records.
        if (embedFilesCount > 0 && !hasLinkedPostFiles) {
            fetchPostById(serverUrl, linkedPostId);
        }
    }, [linkedPostId, post, serverUrl, embedFilesCount, hasLinkedPostFiles]);

    if (isOriginPostDeleted) {
        return null;
    }

    const {
        post: embedPost,
        channel_display_name,
        channel_type,
    } = embedData;

    const translation = embedPost ? getPostTranslation(embedPost, locale) : undefined;

    const truncatedMessage = useMemo(() => {
        let msg = embedPost?.message ?? '';
        if (autotranslationsEnabled && embedPost?.type === '') {
            if (translation?.state === 'ready') {
                msg = getPostTranslatedMessage(msg, translation);
            }
        }
        if (!msg || typeof msg !== 'string') {
            return '';
        }

        const cleanMessage = msg.trim();

        if (cleanMessage.length > MAX_PERMALINK_PREVIEW_CHARACTERS) {
            return cleanMessage.substring(0, MAX_PERMALINK_PREVIEW_CHARACTERS) + '...';
        }

        return cleanMessage;
    }, [autotranslationsEnabled, embedPost?.message, embedPost?.type, translation]);

    const isEdited = useMemo(() => embedData && embedData.post && embedData.post.edit_at > 0, [embedData]);

    const authorDisplayName = useMemo(() => {
        return displayUsername(author, locale, teammateNameDisplay);
    }, [author, locale, teammateNameDisplay]);

    const channelContextText = useMemo(() => {
        const displayName = channel_type === 'D' ? authorDisplayName : channel_display_name;
        return `~${displayName}`;
    }, [channel_display_name, channel_type, authorDisplayName]);

    // Embed data is recalculated per-user on each channel fetch (no update_at bump).
    // Trust it when it's conclusive: explicitly denied (redacted_file_count > 0) or
    // explicitly granted (files are listed). Fall back to the DB linked-post value
    // only when the embed is ambiguous — no files and no redacted count (e.g. stale
    // host post that hasn't been refetched since the ABAC policy was applied).
    const embedRedactedCount = embedData?.post?.metadata?.redacted_file_count ?? 0;
    const dbRedactedCount = post?.metadata?.redacted_file_count ?? 0;

    // The server only populates redacted_file_count when PermissionPolicies is enabled,
    // so no explicit client-side feature-flag gate is needed here.
    let redactedFileCount = dbRedactedCount; // fall back to DB value when embed is ambiguous
    if (embedRedactedCount > 0) {
        redactedFileCount = embedRedactedCount; // embed explicitly denied
    } else if (embedFilesCount > 0) {
        redactedFileCount = 0; // embed explicitly granted (files listed)
    }

    const handlePress = usePreventDoubleTap(useCallback(() => {
        const teamName = embedData.team_name;
        const postId = embedData.post_id;

        if (postId) {
            showPermalink(serverUrl, teamName, postId);
        }
    }, [embedData.team_name, embedData.post_id, serverUrl]));

    const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        setShowGradient(height >= maxPermalinkHeight);
    }, [maxPermalinkHeight]);

    // We need to memoize this value because it is actually a getter that returns a new list
    // on every render. We need to trust that changes in the currentUser will trigger the recalculation.
    const mentionKeys = useMemo(() => currentUser?.mentionKeys ?? undefined, [currentUser]);

    if (!post) {
        return null;
    }

    return (
        <Pressable
            style={({pressed}) => [
                styles.container,
                {
                    opacity: pressed ? 0.8 : 1,
                    maxWidth,
                },
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
                                value={embedPost?.create_at ?? 0}
                                style={styles.timestamp}
                            />
                            {autotranslationsEnabled && embedPost?.type === '' && (
                                <TranslateIcon
                                    translationState={translation?.state}
                                />
                            )}
                        </View>
                    </View>

                    <View style={styles.messageContainer}>
                        <Markdown
                            baseTextStyle={styles.messageText}
                            channelId={embedData.channel_id}
                            location={location}
                            theme={theme}
                            value={truncatedMessage}
                            mentionKeys={mentionKeys}
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

                    {hasLinkedPostFiles && post && (
                        <PermalinkFiles
                            post={post}
                            location='permalink_preview'
                            isReplyPost={false}
                            parentLocation={parentLocation}
                            parentPostId={parentPostId}
                        />
                    )}
                    {redactedFileCount > 0 && (
                        <RedactedFilesPlaceholder/>
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
