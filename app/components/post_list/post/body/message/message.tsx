// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {LayoutChangeEvent, ScrollView, useWindowDimensions, View} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import {SEARCH} from '@constants/screens';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ShowMoreButton from './show_more_button';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {SearchPattern} from '@typings/global/markdown';

type MessageProps = {
    currentUser: UserModel;
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
            fontFamily: 'OpenSans',
            fontSize: 16,
            lineHeight: 24,
        },
        pendingPost: {
            opacity: 0.5,
        },
    };
});

const Message = ({currentUser, highlight, isEdited, isPendingOrFailed, isReplyPost, layoutWidth, location, post, searchPatterns, theme}: MessageProps) => {
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState<number|undefined>();
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);

    const mentionKeys = useMemo(() => {
        return currentUser.mentionKeys;
    }, [currentUser]);

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
                            mentionKeys={mentionKeys}
                            searchPatterns={searchPatterns}
                            theme={theme}
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
