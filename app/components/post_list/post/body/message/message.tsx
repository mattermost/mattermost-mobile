// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {LayoutChangeEvent, useWindowDimensions, ScrollView, View} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import {SEARCH} from '@constants/screens';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {getMentionKeysForPost} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ShowMoreButton from './show_more_button';

import type GroupModel from '@typings/database/models/servers/group';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type MessageProps = {
    currentUser: UserModel;
    groupsForPosts: GroupModel[];
    highlight: boolean;
    isEdited: boolean;
    isPendingOrFailed: boolean;
    isReplyPost: boolean;
    location: string;
    post: PostModel;
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

const Message = ({currentUser, groupsForPosts, highlight, isEdited, isPendingOrFailed, isReplyPost, location, post, theme}: MessageProps) => {
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState<number|undefined>();
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const mentionKeys = useMemo(() => {
        return getMentionKeysForPost(currentUser, post, groupsForPosts);
    }, [currentUser, post.message, groupsForPosts]);

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
                            channelMentions={post.props?.channel_mentions}
                            imagesMetadata={post.metadata?.images}
                            isEdited={isEdited}
                            isReplyPost={isReplyPost}
                            isSearchResult={location === SEARCH}
                            postId={post.id}
                            textStyles={textStyles}
                            value={post.message}
                            mentionKeys={mentionKeys}
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
