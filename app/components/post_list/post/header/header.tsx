// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {removePost} from '@actions/local/post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import ExpiryTimer from '@components/post_list/post/header/expiry_timer';
import PostPriorityLabel from '@components/post_priority/post_priority_label';
import {CHANNEL, THREAD} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {DEFAULT_LOCALE} from '@i18n';
import {isUnrevealedBoRPost} from '@utils/bor';
import {getPostTranslation, postUserDisplayName} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {ensureString} from '@utils/types';
import {typography} from '@utils/typography';
import {
    displayUsername,
    getUserCustomStatus,
    getUserTimezone,
    isCustomStatusExpired,
} from '@utils/user';

import HeaderCommentedOn from './commented_on';
import HeaderDisplayName from './display_name';
import HeaderReply from './reply';
import HeaderTag from './tag';
import TranslateIcon from './translate_icon';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

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
  location: AvailableScreens;
  post: PostModel;
  rootPostAuthor?: UserModel;
  showPostPriority: boolean;
  shouldRenderReplyButton?: boolean;
  teammateNameDisplay: string;
  hideGuestTags: boolean;
  isChannelAutotranslated: boolean;
};

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
            alignItems: 'center',
            gap: 5,
        },
        time: {
            color: theme.centerChannelColor,
            opacity: 0.5,
            ...typography('Body', 75, 'Regular'),
        },
        visibleToYou: {
            color: theme.centerChannelColor,
            opacity: 0.5,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const Header = ({
    commentCount,
    enablePostUsernameOverride,
    hideGuestTags,
    isAutoResponse,
    isChannelAutotranslated,
    isCustomStatusEnabled,
    isEphemeral,
    isMilitaryTime,
    isPendingOrFailed,
    isSystemPost,
    isWebHook,
    location,
    post,
    showPostPriority,
    teammateNameDisplay,
    author,
    currentUser,
    isCRTEnabled,
    rootPostAuthor,
    shouldRenderReplyButton,
}: HeaderProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const pendingPostStyle = isPendingOrFailed ? style.pendingPost : undefined;
    const isReplyPost = Boolean(post.rootId && !isEphemeral);
    const showReply =
    !isReplyPost &&
    location !== THREAD &&
    shouldRenderReplyButton &&
    !rootPostAuthor &&
    commentCount > 0;
    const displayName = postUserDisplayName(
        post,
        author,
        teammateNameDisplay,
        enablePostUsernameOverride,
    );
    const rootAuthorDisplayName = rootPostAuthor
        ? displayUsername(
            rootPostAuthor,
            currentUser?.locale,
            teammateNameDisplay,
            true,
        )
        : undefined;
    const customStatus = getUserCustomStatus(author);
    const showCustomStatusEmoji =
    Boolean(
        isCustomStatusEnabled &&
        displayName &&
        customStatus &&
        !(isSystemPost || author?.isBot || isAutoResponse || isWebHook),
    ) &&
    !isCustomStatusExpired(author) &&
    Boolean(customStatus?.emoji);
    const userIconOverride = ensureString(post.props?.override_icon_url);
    const usernameOverride = ensureString(post.props?.override_username);
    const intl = useIntl();

    /* eslint-disable react-hooks/exhaustive-deps -- expire_at triggers recomputation when post metadata changes */
    const showBoRIcon = useMemo(
        () => isUnrevealedBoRPost(post),
        [post, post.metadata?.expire_at],
    );
    /* eslint-enable react-hooks/exhaustive-deps */
    const borExpireAt = post.metadata?.expire_at;
    const serverUrl = useServerUrl();

    const onBoRPostExpiry = useCallback(async () => {
        await removePost(serverUrl, post);
    }, [post, serverUrl]);

    const translation = getPostTranslation(post, intl.locale);

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
                        userIconOverride={userIconOverride}
                        userId={post.userId}
                        usernameOverride={usernameOverride}
                        showCustomStatusEmoji={showCustomStatusEmoji}
                        customStatus={customStatus!}
                    />
                    {(!isSystemPost || isAutoResponse) && (
                        <HeaderTag
                            isAutoResponder={isAutoResponse}
                            isAutomation={isWebHook || author?.isBot}
                            showGuestTag={author?.isGuest && !hideGuestTags}
                        />
                    )}
                    <FormattedTime
                        timezone={getUserTimezone(currentUser)}
                        isMilitaryTime={isMilitaryTime}
                        value={post.createAt}
                        style={style.time}
                        testID='post_header.date_time'
                    />
                    {isChannelAutotranslated && post.type === '' && (
                        <TranslateIcon translationState={translation?.state}/>
                    )}
                    {isEphemeral && (
                        <FormattedText
                            id='post_header.visible_message'
                            defaultMessage='(Only visible to you)'
                            style={style.visibleToYou}
                            testID='post_header.visible_message'
                        />
                    )}
                    {showPostPriority && post.metadata?.priority?.priority && (
                        <PostPriorityLabel label={post.metadata.priority.priority}/>
                    )}
                    {showBoRIcon && (
                        <CompassIcon
                            name='fire'
                            size={16}
                            color={theme.dndIndicator}
                        />
                    )}
                    {Boolean(borExpireAt) && (
                        <ExpiryTimer
                            expiryTime={borExpireAt as number}
                            onExpiry={onBoRPostExpiry}
                        />
                    )}
                    {!isCRTEnabled && showReply && commentCount > 0 && (
                        <HeaderReply
                            commentCount={commentCount}
                            location={location}
                            post={post}
                            theme={theme}
                        />
                    )}
                </View>
            </View>
            {Boolean(rootAuthorDisplayName) && location === CHANNEL && (
                <HeaderCommentedOn
                    locale={currentUser?.locale || DEFAULT_LOCALE}
                    name={rootAuthorDisplayName!}
                    theme={theme}
                />
            )}
        </>
    );
};

export default Header;
