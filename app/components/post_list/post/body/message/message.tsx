// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {type LayoutChangeEvent, ScrollView, useWindowDimensions, View} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import {SEARCH} from '@constants/screens';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ShowMoreButton from './show_more_button';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {HighlightWithoutNotificationKey, SearchPattern, UserMentionKey} from '@typings/global/markdown';

type MessageProps = {
    currentUser?: UserModel;
    isHighlightWithoutNotificationLicensed?: boolean;
    highlight: boolean;
    isEdited: boolean;
    isPendingOrFailed: boolean;
    isReplyPost: boolean;
    layoutWidth?: number;
    location: string;
    post: PostModel;
    searchPatterns?: SearchPattern[];
    theme: Theme;
}

const SHOW_MORE_HEIGHT = 54;

const EMPTY_MENTION_KEYS: UserMentionKey[] = [];
const EMPTY_HIGHLIGHT_KEYS: HighlightWithoutNotificationKey[] = [];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageContainer: {
            width: '100%',
        },
        reply: {
            paddingRight: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            lineHeight: undefined, // remove line height, not needed and causes problems with md images
        },
        pendingPost: {
            opacity: 0.5,
        },
    };
});

const Message = ({currentUser, isHighlightWithoutNotificationLicensed, highlight, isEdited, isPendingOrFailed, isReplyPost, layoutWidth, location, post, searchPatterns, theme}: MessageProps) => {
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState<number|undefined>();
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);

    const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);
    const onPress = () => setOpen(!open);

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
                        style={[style.messageContainer, (isReplyPost && style.reply), (isPendingOrFailed && style.pendingPost)]}
                        onLayout={onLayout}
                    >
                        <Markdown
                            baseTextStyle={style.message}
                            blockStyles={blockStyles}
                            channelId={post.channelId}
                            channelMentions={post.props?.channel_mentions}
                            imagesMetadata={post.metadata?.images}
                            isEdited={isEdited}
                            isReplyPost={isReplyPost}
                            isSearchResult={location === SEARCH}
                            layoutWidth={layoutWidth}
                            location={location}
                            postId={post.id}
                            textStyles={textStyles}
                            value={post.message}
                            mentionKeys={currentUser?.mentionKeys ?? EMPTY_MENTION_KEYS}
                            highlightKeys={isHighlightWithoutNotificationLicensed ? (currentUser?.highlightKeys ?? EMPTY_HIGHLIGHT_KEYS) : EMPTY_HIGHLIGHT_KEYS}
                            searchPatterns={searchPatterns}
                            theme={theme}
                            isUnsafeLinksPost={post.props.unsafe_links && post.props.unsafe_links !== ''}
                        />
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
