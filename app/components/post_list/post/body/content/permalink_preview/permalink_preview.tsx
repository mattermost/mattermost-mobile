// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useMemo, useCallback, useState} from 'react';
import {Text, View, Pressable, type LayoutChangeEvent} from 'react-native';

import EditedIndicator from '@components/EditedIndicator';
import FormattedTime from '@components/formatted_time';
import Markdown from '@components/markdown';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import PermalinkFiles from './permalink_files';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const MAX_PERMALINK_PREVIEW_LINES = 4;
const MAX_PERMALINK_HEIGHT = 506;

type PermalinkPreviewProps = {
    embedData: PermalinkEmbedData;
    showPermalinkPreviews: boolean;
    author?: UserModel;
    locale: string;
    teammateNameDisplay: string;
    isOriginPostDeleted?: boolean;
    location: AvailableScreens;
    canDownloadFiles?: boolean;
    enableSecureFilePreview?: boolean;
    filesInfo?: FileInfo[];
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
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 2,
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
            maxHeight: MAX_PERMALINK_HEIGHT,
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

const PermalinkPreview = ({embedData, showPermalinkPreviews, author, locale, teammateNameDisplay, isOriginPostDeleted, location, canDownloadFiles = true, enableSecureFilePreview = false, filesInfo = [], parentLocation, parentPostId}: PermalinkPreviewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [showGradient, setShowGradient] = useState(false);

    const textStyles = getMarkdownTextStyles(theme);
    const blockStyles = getMarkdownBlockStyles(theme);

    if (!showPermalinkPreviews || isOriginPostDeleted) {
        return null;
    }

    const {
        post,
        channel_display_name,
        channel_type,
    } = embedData;

    const truncatedMessage = useMemo(() => {
        const message = post?.message;

        if (!message || typeof message !== 'string') {
            return '';
        }

        const cleanMessage = message.trim();
        const lines = cleanMessage.split('\n');
        if (lines.length > MAX_PERMALINK_PREVIEW_LINES) {
            return lines.slice(0, MAX_PERMALINK_PREVIEW_LINES).join('\n') + '...';
        }

        return cleanMessage;
    }, [post?.message]);

    const isEdited = useMemo(() => post && post.edit_at, [post]);

    const authorDisplayName = useMemo(() => {
        if (author) {
            return displayUsername(author, locale, teammateNameDisplay);
        }
        return displayUsername(undefined, locale, teammateNameDisplay);
    }, [author, locale, teammateNameDisplay]);

    const channelContextText = useMemo(() => {
        const displayName = channel_type === 'D' ? authorDisplayName : channel_display_name;
        return `~${displayName}`;
    }, [channel_display_name, channel_type, authorDisplayName]);

    const hasFiles = useMemo(() => {
        return filesInfo && filesInfo.length > 0;
    }, [filesInfo]);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        // Navigation will be implemented in Task 5
    }, []));

    const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        setShowGradient(height >= MAX_PERMALINK_HEIGHT);
    }, []);

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
            <View style={styles.contentContainer}>
                <View onLayout={handleContentLayout}>
                    <View style={styles.header}>
                        <ProfilePicture
                            author={author || {id: post.user_id} as UserModel}
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
                                timezone=''
                                isMilitaryTime={false}
                                value={post.create_at}
                                style={styles.timestamp}
                            />
                        </View>
                    </View>

                    <View style={styles.messageContainer}>
                        <Markdown
                            baseTextStyle={styles.messageText}
                            blockStyles={blockStyles}
                            channelId={embedData.channel_id}
                            disableGallery={true}
                            disableHashtags={true}
                            disableAtMentions={true}
                            disableChannelLink={true}
                            location={location}
                            theme={theme}
                            textStyles={textStyles}
                            value={truncatedMessage}
                        />
                        {isEdited ? (
                            <EditedIndicator
                                baseTextStyle={styles.messageText}
                                theme={theme}
                                context={['paragraph']}
                                iconSize={12}
                                testID='permalink_preview.edited_indicator_separate'
                            />
                        ) : null}
                    </View>

                    {hasFiles && (
                        <PermalinkFiles
                            canDownloadFiles={canDownloadFiles}
                            enableSecureFilePreview={enableSecureFilePreview}
                            filesInfo={filesInfo}
                            location='permalink_preview'
                            isReplyPost={false}
                            postId={post.id}
                            postProps={post.props}
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
                {'Originally posted in '}
                <Text style={styles.channelName}>
                    {channelContextText}
                </Text>
            </Text>
        </Pressable>
    );
};

export default PermalinkPreview;