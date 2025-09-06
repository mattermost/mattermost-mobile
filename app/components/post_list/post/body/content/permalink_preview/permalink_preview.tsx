// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useCallback} from 'react';
import {Text, View, Pressable} from 'react-native';

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

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const MAX_PERMALINK_PREVIEW_LINES = 4;

type PermalinkPreviewProps = {
    embedData: PermalinkEmbedData;
    showPermalinkPreviews: boolean;
    author?: UserModel;
    locale: string;
    teammateNameDisplay: string;
    isOriginPostDeleted?: boolean;
    location: AvailableScreens;
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
            elevation: 2,
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
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        channelName: {
            color: theme.linkColor,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

const PermalinkPreview = ({embedData, showPermalinkPreviews, author, locale, teammateNameDisplay, isOriginPostDeleted, location}: PermalinkPreviewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

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

    const handlePress = usePreventDoubleTap(useCallback(() => {
        // Navigation will be implemented in Task 5
    }, []));

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
