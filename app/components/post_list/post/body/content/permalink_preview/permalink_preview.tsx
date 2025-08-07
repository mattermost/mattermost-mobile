// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View, Pressable} from 'react-native';

import EditedIndicator from '@components/EditedIndicator';
import FormattedTime from '@components/formatted_time';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type PermalinkPreviewProps = {
    embedData: PermalinkEmbedData;
    showPermalinkPreviews: boolean;
    author?: UserModel;
    locale: string;
    teammateNameDisplay: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            borderRadius: 8,
            marginTop: 8,
            marginBottom: 8,
            padding: 12,
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
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        channelName: {
            color: theme.linkColor,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

const PermalinkPreview = ({embedData, showPermalinkPreviews, author, locale, teammateNameDisplay}: PermalinkPreviewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (!showPermalinkPreviews) {
        return null;
    }

    const {
        post,
        channel_display_name,
        channel_type,
    } = embedData;

    const {formattedMessage} = useMemo(() => {
        const message = post?.message;

        if (!message || typeof message !== 'string') {
            return {formattedMessage: ''};
        }

        const cleanMessage = message.trim();

        const lines = cleanMessage.split('\n');
        if (lines.length > 4) {
            return {
                formattedMessage: lines.slice(0, 4).join('\n') + '...',
            };
        }

        return {
            formattedMessage: cleanMessage,
        };
    }, [post?.message]);

    const isEdited = useMemo(() => {
        return post && post.edit_at && post.edit_at > 0;
    }, [post]);

    const channelContextText = useMemo(() => {
        const channelPrefix = channel_type === 'D' ? '@' : '~';
        return `${channelPrefix}${channel_display_name}`;
    }, [channel_display_name, channel_type]);

    const authorDisplayName = useMemo(() => {
        if (author) {
            return displayUsername(author, locale, teammateNameDisplay);
        }

        return post?.user_id ? `User ${post.user_id.slice(-4)}` : 'Unknown User';
    }, [author, locale, teammateNameDisplay, post?.user_id]);

    const handlePress = preventDoubleTap(() => {
        // Navigation will be implemented in Task 5
    });

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
                <Text
                    style={styles.messageText}
                    numberOfLines={4}
                    ellipsizeMode='tail'
                >
                    {formattedMessage}
                    {isEdited ? (
                        <EditedIndicator
                            baseTextStyle={styles.messageText}
                            theme={theme}
                            context={['paragraph']}
                            iconSize={12}
                            testID='permalink_preview.edited_indicator_separate'
                        />
                    ) : null}
                </Text>
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
