// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {type LayoutChangeEvent, ScrollView, type StyleProp, useWindowDimensions, View, type ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import {isChannelMentions} from '@components/markdown/channel_mention/channel_mention';
import {SEARCH} from '@constants/screens';
import {MESSAGE_BUBBLE_MAX_WIDTH_PERCENT} from '@constants/view';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import ShowMoreButton from './show_more_button';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {HighlightWithoutNotificationKey, SearchPattern} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type MessageProps = {
    currentUser?: UserModel;
    isHighlightWithoutNotificationLicensed?: boolean;
    highlight: boolean;
    isEdited: boolean;
    isMyPost?: boolean;
    isPendingOrFailed: boolean;
    isReplyPost: boolean;
    layoutWidth?: number;
    location: AvailableScreens;
    post: PostModel;
    searchPatterns?: SearchPattern[];
    theme: Theme;
}

const SHOW_MORE_HEIGHT = 54;

const EMPTY_HIGHLIGHT_KEYS: HighlightWithoutNotificationKey[] = [];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageContainer: {
            width: '100%',
        },
        bubble: {
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        bubbleLeft: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderTopLeftRadius: 2,
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
            borderBottomLeftRadius: 2,
        },
        bubbleRight: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.8),
            borderTopLeftRadius: 10,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            borderBottomLeftRadius: 10,
        },
        reply: {
            paddingRight: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            lineHeight: undefined, // remove line height, not needed and causes problems with md images
        },
        messageMy: {
            color: theme.buttonColor,
            ...typography('Body', 200),
            lineHeight: undefined,
        },
        pendingPost: {
            opacity: 0.5,
        },
    };
});

const Message = ({currentUser, isHighlightWithoutNotificationLicensed, highlight, isEdited, isMyPost, isPendingOrFailed, isReplyPost, layoutWidth, location, post, searchPatterns, theme}: MessageProps) => {
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState<number|undefined>();
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);
    const style = getStyleSheet(theme);

    // Dynamic alignment for my posts
    const messageContainerStyle: StyleProp<ViewStyle> = isMyPost ? {alignItems: 'flex-end'} : undefined;

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const h = event.nativeEvent.layout.height;
        if (h > maxHeight) {
            setHeight(event.nativeEvent.layout.height);
        }
    }, [maxHeight]);
    const onPress = () => setOpen(!open);

    const channelMentions = useMemo(() => {
        return isChannelMentions(post.props?.channel_mentions) ? post.props.channel_mentions : {};
    }, [post.props?.channel_mentions]);

    return (
        <>
            <Animated.View style={animatedStyle}>
                <ScrollView
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <View
                        style={[style.messageContainer, messageContainerStyle, (isReplyPost && style.reply), (isPendingOrFailed && style.pendingPost)]}
                        onLayout={onLayout}
                    >
                        <View
                            style={[
                                style.bubble,
                                isMyPost ? style.bubbleRight : style.bubbleLeft,
                                {maxWidth: Math.round(((layoutWidth || dimensions.width) * MESSAGE_BUBBLE_MAX_WIDTH_PERCENT))},
                                {alignSelf: isMyPost ? 'flex-end' : 'flex-start'},
                            ]}
                        >
                            <Markdown
                                baseTextStyle={isMyPost ? style.messageMy : style.message}
                                channelId={post.channelId}
                                channelMentions={channelMentions}
                                imagesMetadata={post.metadata?.images}
                                isEdited={isEdited}
                                isMyPost={isMyPost}
                                isReplyPost={isReplyPost}
                                isSearchResult={location === SEARCH}
                                layoutWidth={layoutWidth}
                                location={location}
                                postId={post.id}
                                value={post.message}
                                mentionKeys={currentUser?.mentionKeys ?? []}
                                highlightKeys={isHighlightWithoutNotificationLicensed ? (currentUser?.highlightKeys ?? EMPTY_HIGHLIGHT_KEYS) : EMPTY_HIGHLIGHT_KEYS}
                                searchPatterns={searchPatterns}
                                theme={theme}
                                isUnsafeLinksPost={Boolean(post.props?.unsafe_links && post.props.unsafe_links !== '')}
                            />
                        </View>
                    </View>
                </ScrollView>
            </Animated.View>
            {(height || 0) > maxHeight &&
            <ShowMoreButton
                highlight={highlight}
                theme={theme}
                showMore={!open}
                onPress={onPress}
            />
            }
        </>
    );
};

export default Message;
