// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, StyleProp, View, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import JumboEmoji from '@components/jumbo_emoji';
import {Screens} from '@constants';
import {THREAD} from '@constants/screens';
import {isEdited as postEdited} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';

import AddMembers from './add_members';
import Content from './content';
import Failed from './failed';
import Files from './files';
import Message from './message';
import Reactions from './reactions';

import type PostModel from '@typings/database/models/servers/post';
import type {SearchPattern} from '@typings/global/markdown';

type BodyProps = {
    appsEnabled: boolean;
    filesCount: number;
    hasReactions: boolean;
    highlight: boolean;
    highlightReplyBar: boolean;
    isEphemeral: boolean;
    isFirstReply?: boolean;
    isJumboEmoji: boolean;
    isLastReply?: boolean;
    isPendingOrFailed: boolean;
    isPostAddChannelMember: boolean;
    location: string;
    post: PostModel;
    searchPatterns?: SearchPattern[];
    showAddReaction?: boolean;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageBody: {
            paddingVertical: 2,
            flex: 1,
        },
        messageContainer: {width: '100%'},
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginLeft: 1,
            marginRight: 7,
            width: 3,
            flexBasis: 3,
        },
        replyBarFirst: {paddingTop: 10},
        replyBarLast: {paddingBottom: 10},
        replyMention: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            width: '100%',
        },
    };
});

const Body = ({
    appsEnabled, filesCount, hasReactions, highlight, highlightReplyBar,
    isEphemeral, isFirstReply, isJumboEmoji, isLastReply, isPendingOrFailed, isPostAddChannelMember,
    location, post, searchPatterns, showAddReaction, theme,
}: BodyProps) => {
    const style = getStyleSheet(theme);
    const isEdited = postEdited(post);
    const [layoutWidth, setLayoutWidth] = useState(0);
    const hasBeenDeleted = Boolean(post.deleteAt);
    let body;
    let message;

    const isReplyPost = Boolean(post.rootId && (!isEphemeral || !hasBeenDeleted) && location !== THREAD);
    const hasContent = (post.metadata?.embeds?.length || (appsEnabled && post.props?.app_bindings?.length)) || post.props?.attachments?.length;

    const replyBarStyle = useCallback((): StyleProp<ViewStyle>|undefined => {
        if (!isReplyPost) {
            return undefined;
        }

        const barStyle = [style.replyBar];

        if (isFirstReply) {
            barStyle.push(style.replyBarFirst);
        }

        if (isLastReply) {
            barStyle.push(style.replyBarLast);
        }

        if (highlightReplyBar) {
            barStyle.push(style.replyMention);
        }

        return barStyle;
    }, []);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.SAVED_POSTS) {
            setLayoutWidth(e.nativeEvent.layout.width);
        }
    }, [location]);

    if (hasBeenDeleted) {
        body = (
            <FormattedText
                style={style.message}
                id='post_body.deleted'
                defaultMessage='(message deleted)'
            />
        );
    } else if (isPostAddChannelMember) {
        message = (
            <AddMembers
                location={location}
                post={post}
                theme={theme}
            />
        );
    } else if (isJumboEmoji) {
        message = (
            <JumboEmoji
                baseTextStyle={style.message}
                isEdited={isEdited}
                value={post.message}
            />
        );
    } else if (post.message.length) {
        message = (
            <Message
                highlight={highlight}
                isEdited={isEdited}
                isPendingOrFailed={isPendingOrFailed}
                isReplyPost={isReplyPost}
                layoutWidth={layoutWidth}
                location={location}
                post={post}
                searchPatterns={searchPatterns}
                theme={theme}
            />
        );
    }

    if (!hasBeenDeleted) {
        body = (
            <View style={style.messageBody}>
                {message}
                {hasContent &&
                <Content
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    post={post}
                    theme={theme}
                />
                }
                {filesCount > 0 &&
                <Files
                    failed={post.props?.failed}
                    layoutWidth={layoutWidth}
                    location={location}
                    post={post}
                    isReplyPost={isReplyPost}
                    theme={theme}
                />
                }
                {hasReactions && showAddReaction &&
                <Reactions
                    location={location}
                    post={post}
                    theme={theme}
                />
                }
            </View>
        );
    }

    return (
        <View
            style={style.messageContainerWithReplyBar}
            onLayout={onLayout}
        >
            <View style={replyBarStyle()}/>
            {body}
            {post.props?.failed &&
            <Failed
                post={post}
                theme={theme}
            />
            }
        </View>
    );
};

export default Body;
