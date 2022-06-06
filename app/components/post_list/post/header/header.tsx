// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import FormattedTime from '@components/formatted_time';
import {CHANNEL, THREAD} from '@constants/screens';
import {useTheme} from '@context/theme';
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
    author: UserModel;
    commentCount: number;
    currentUser: UserModel;
    enablePostUsernameOverride: boolean;
    isAutoResponse: boolean;
    isCRTEnabled?: boolean;
    isEphemeral: boolean;
    isMilitaryTime: boolean;
    isPendingOrFailed: boolean;
    isSystemPost: boolean;
    isTimezoneEnabled: boolean;
    isWebHook: boolean;
    location: string;
    post: PostModel;
    rootPostAuthor?: UserModel;
    shouldRenderReplyButton?: boolean;
    teammateNameDisplay: string;
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
            flex: 1,
            ...typography('Body', 75, 'Regular'),
        },
        customStatusEmoji: {
            color: theme.centerChannelColor,
            marginRight: 4,
            marginTop: 2,
        },
    };
});

const Header = (props: HeaderProps) => {
    const {
        author, commentCount = 0, currentUser, enablePostUsernameOverride, isAutoResponse, isCRTEnabled,
        isEphemeral, isMilitaryTime, isPendingOrFailed, isSystemPost, isTimezoneEnabled, isWebHook,
        location, post, rootPostAuthor, shouldRenderReplyButton, teammateNameDisplay,
    } = props;
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const pendingPostStyle = isPendingOrFailed ? style.pendingPost : undefined;
    const isReplyPost = Boolean(post.rootId && !isEphemeral);
    const showReply = !isReplyPost && (location !== THREAD) && (shouldRenderReplyButton && (!rootPostAuthor && commentCount > 0));
    const displayName = postUserDisplayName(post, author, teammateNameDisplay, enablePostUsernameOverride);
    const rootAuthorDisplayName = rootPostAuthor ? displayUsername(rootPostAuthor, currentUser.locale, teammateNameDisplay, true) : undefined;
    const customStatus = getUserCustomStatus(author);
    const customStatusExpired = isCustomStatusExpired(author);
    const showCustomStatusEmoji = Boolean(
        displayName && customStatus &&
        !(isSystemPost || author.isBot || isAutoResponse || isWebHook),
    );

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
                    />
                    {showCustomStatusEmoji && !customStatusExpired && Boolean(customStatus?.emoji) && (
                        <CustomStatusEmoji
                            customStatus={customStatus!}
                            style={style.customStatusEmoji}
                            testID='post_header'
                        />
                    )}
                    {(!isSystemPost || isAutoResponse) &&
                    <HeaderTag
                        isAutoResponder={isAutoResponse}
                        isAutomation={isWebHook || author.isBot}
                        isGuest={author.isGuest}
                    />
                    }
                    <FormattedTime
                        timezone={isTimezoneEnabled ? getUserTimezone(currentUser) : ''}
                        isMilitaryTime={isMilitaryTime}
                        value={post.createAt}
                        style={style.time}
                        testID='post_header.date_time'
                    />
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
                locale={currentUser.locale}
                name={rootAuthorDisplayName!}
                theme={theme}
            />
            }
        </>
    );
};

export default Header;
