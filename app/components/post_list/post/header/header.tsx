// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedTime from '@components/formatted_time';
import PostPriorityLabel from '@components/post_priority/post_priority_label';
import {CHANNEL, THREAD} from '@constants/screens';
import {useTheme} from '@context/theme';
import {DEFAULT_LOCALE} from '@i18n';
import {postUserDisplayName} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserCustomStatus, getUserTimezone, isCustomStatusExpired} from '@utils/user';

import HeaderCommentedOn from './commented_on';
import HeaderDisplayName from './display_name';
import HeaderReply from './reply';
import HeaderTag from './tag';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type HeaderProps = {
    author?: UserModel;
    commentCount: number;
    currentUser?: UserModel;
    enablePostUsernameOverride: boolean;
    isAutoResponse: boolean;
    isCRTEnabled?: boolean;
    isCustomStatusEnabled: boolean;
    isEphemeral: boolean;
    isMilitaryTime: boolean;
    isPendingOrFailed: boolean;
    isSystemPost: boolean;
    isWebHook: boolean;
    location: string;
    post: PostModel;
    rootPostAuthor?: UserModel;
    showPostPriority: boolean;
    shouldRenderReplyButton?: boolean;
    teammateNameDisplay: string;
    hideGuestTags: boolean;
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
            marginTop: 5,
            opacity: 0.5,
            ...typography('Body', 75, 'Regular'),
        },
        postPriority: {
            alignSelf: 'center',
            marginLeft: 6,
        },
    };
});

const Header = (props: HeaderProps) => {
    const {
        author, commentCount = 0, currentUser, enablePostUsernameOverride, isAutoResponse, isCRTEnabled, isCustomStatusEnabled,
        isEphemeral, isMilitaryTime, isPendingOrFailed, isSystemPost, isWebHook,
        location, post, rootPostAuthor, showPostPriority, shouldRenderReplyButton, teammateNameDisplay, hideGuestTags,
    } = props;
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const pendingPostStyle = isPendingOrFailed ? style.pendingPost : undefined;
    const isReplyPost = Boolean(post.rootId && !isEphemeral);
    const showReply = !isReplyPost && (location !== THREAD) && (shouldRenderReplyButton && (!rootPostAuthor && commentCount > 0));
    const displayName = postUserDisplayName(post, author, teammateNameDisplay, enablePostUsernameOverride);
    const rootAuthorDisplayName = rootPostAuthor ? displayUsername(rootPostAuthor, currentUser?.locale, teammateNameDisplay, true) : undefined;
    const customStatus = getUserCustomStatus(author);
    const showCustomStatusEmoji = Boolean(
        isCustomStatusEnabled && displayName && customStatus &&
        !(isSystemPost || author?.isBot || isAutoResponse || isWebHook),
    ) && !isCustomStatusExpired(author) && Boolean(customStatus?.emoji);

    return (
        <>
            <View style={[style.container, pendingPostStyle]}>
                <View style={style.wrapper}>
                    <HeaderDisplayName
                        channelId={post.channelId}
                        commentCount={commentCount}
                        displayName={displayName}
                        location={location}
                        rootPostAuthor={rootAuthorDisplayName}
                        shouldRenderReplyButton={shouldRenderReplyButton}
                        theme={theme}
                        userIconOverride={post.props?.override_icon_url}
                        userId={post.userId}
                        usernameOverride={post.props?.override_username}
                        showCustomStatusEmoji={showCustomStatusEmoji}
                        customStatus={customStatus!}
                    />
                    {(!isSystemPost || isAutoResponse) &&
                    <HeaderTag
                        isAutoResponder={isAutoResponse}
                        isAutomation={isWebHook || author?.isBot}
                        showGuestTag={author?.isGuest && !hideGuestTags}
                    />
                    }
                    <FormattedTime
                        timezone={getUserTimezone(currentUser)}
                        isMilitaryTime={isMilitaryTime}
                        value={post.createAt}
                        style={style.time}
                        testID='post_header.date_time'
                    />
                    {showPostPriority && post.metadata?.priority?.priority && (
                        <View style={style.postPriority}>
                            <PostPriorityLabel
                                label={post.metadata.priority.priority}
                            />
                        </View>
                    )}
                    {!isCRTEnabled && showReply && commentCount > 0 &&
                        <HeaderReply
                            commentCount={commentCount}
                            location={location}
                            post={post}
                            theme={theme}
                        />
                    }
                </View>
            </View>
            {Boolean(rootAuthorDisplayName) && location === CHANNEL &&
            <HeaderCommentedOn
                locale={currentUser?.locale || DEFAULT_LOCALE}
                name={rootAuthorDisplayName!}
                theme={theme}
            />
            }
        </>
    );
};

export default Header;
