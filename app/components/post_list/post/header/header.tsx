// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedTime from '@components/formatted_time';
import {CHANNEL, THREAD} from '@constants/screen';
import {Posts} from '@mm-redux/constants';
import {fromAutoResponder, isFromWebhook, isPostEphemeral, isPostPendingOrFailed, isSystemMessage} from '@mm-redux/utils/post_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

import HeaderCommentedOn from './commented_on';
import HeaderDisplayName from './display_name';
import HeaderReply from './reply';
import HeaderTag from './tag';

type HeaderProps = {
    commentCount: number;
    displayName?: string;
    isBot: boolean;
    isGuest: boolean;
    isMilitaryTime: boolean;
    location: string;
    post: Post;
    rootPostAuthor?: string;
    shouldRenderReplyButton?: boolean;
    theme: Theme;
    userTimezone?: string | null;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            marginTop: 10,
        },
        pendingPost: {
            opacity: 0.5,
        },
        wrapper: {
            flex: 1,
            flexDirection: 'row',
        },
        time: {
            color: theme.centerChannelColor,
            fontSize: 12,
            marginTop: 5,
            opacity: 0.5,
            flex: 1,
        },
    };
});

const Header = ({
    commentCount, displayName, location, isBot, isGuest,
    isMilitaryTime, post, rootPostAuthor, shouldRenderReplyButton, theme, userTimezone,
}: HeaderProps) => {
    const style = getStyleSheet(theme);
    const pendingPostStyle = isPostPendingOrFailed(post) ? style.pendingPost : undefined;
    const isAutoResponse = fromAutoResponder(post);
    const isWebHook = isFromWebhook(post);
    const isSystemPost = isSystemMessage(post);
    const isReplyPost = Boolean(post.root_id && (!isPostEphemeral(post) || post.state === Posts.POST_DELETED));
    const showReply = !isReplyPost && (location !== THREAD) && (shouldRenderReplyButton || (!rootPostAuthor && commentCount > 0));

    return (
        <>
            <View style={[style.container, pendingPostStyle]}>
                <View style={style.wrapper}>
                    <HeaderDisplayName
                        commentCount={commentCount}
                        displayName={displayName}
                        isAutomation={isBot || isAutoResponse || isWebHook}
                        rootPostAuthor={rootPostAuthor}
                        shouldRenderReplyButton={shouldRenderReplyButton}
                        theme={theme}
                        userId={post.user_id}
                    />
                    {!isSystemPost &&
                    <HeaderTag
                        isAutoResponder={isAutoResponse}
                        isAutomation={isWebHook || isBot}
                        isGuest={isGuest}
                        theme={theme}
                    />
                    }
                    <FormattedTime
                        timezone={userTimezone || ''}
                        isMilitaryTime={isMilitaryTime}
                        value={post.create_at}
                        style={style.time}
                        testID='post_header.date_time'
                    />
                    {showReply &&
                    <HeaderReply
                        commentCount={commentCount}
                        location={location}
                        post={post}
                        theme={theme}
                    />
                    }
                </View>
            </View>
            {Boolean(rootPostAuthor) && location === CHANNEL &&
            <HeaderCommentedOn
                name={rootPostAuthor!}
                theme={theme}
            />
            }
        </>
    );
};

Header.defaultProps = {
    commentCount: 0,
};

export default Header;
