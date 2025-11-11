// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable */
import React, {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, type StyleProp, View, type ViewStyle, TouchableHighlight} from 'react-native';

import {removePost} from '@actions/local/post';
import {showPermalink} from '@actions/remote/permalink';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import CallsCustomMessage from '@calls/components/calls_custom_message';
import {isCallsCustomMessage} from '@calls/utils';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import {POST_TIME_TO_FAIL} from '@constants/post';
import * as Screens from '@constants/screens';
import {useHideExtraKeyboardIfNeeded} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {openAsBottomSheet} from '@screens/navigation';
import {hasJumboEmojiOnly} from '@utils/emoji/helpers';
import {fromAutoResponder, isFromWebhook, isPostFailed, isPostPendingOrFailed, isSystemMessage} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import LivekitCustomMessage from '../../../products/calls/components/livekit_custom_message';
import Avatar from './avatar';
import Body from './body';
import Footer from './footer';
import Header from './header';
import PreHeader from './pre_header';
import SystemMessage from './system_message';
import UnreadDot from './unread_dot';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';
import type {SearchPattern} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type DaakiaPostProps = {
    appsEnabled: boolean;
    canDelete: boolean;
    currentUser?: UserModel;
    customEmojiNames: string[];
    differentThreadSequence: boolean;
    hasFiles: boolean;
    hasReplies: boolean;
    highlight?: boolean;
    highlightPinnedOrSaved?: boolean;
    highlightReplyBar: boolean;
    isConsecutivePost?: boolean;
    isCRTEnabled?: boolean;
    isDMChannel?: boolean;
    isEphemeral: boolean;
    isFirstReply?: boolean;
    isPostAcknowledgementEnabled?: boolean;
    isSaved?: boolean;
    isLastReply?: boolean;
    isPostAddChannelMember: boolean;
    isPostPriorityEnabled: boolean;
    location: AvailableScreens;
    post: PostModel;
    rootId?: string;
    previousPost?: PostModel;
    isLastPost: boolean;
    hasReactions: boolean;
    searchPatterns?: SearchPattern[];
    shouldRenderReplyButton?: boolean;
    showAddReaction?: boolean;
    skipSavedHeader?: boolean;
    skipPinnedHeader?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    thread?: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        consecutive: {marginTop: 0},
        consecutivePostContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: Platform.select({ios: 34, android: 33}),
            marginTop: 10,
        },
        container: {flexDirection: 'row'},
        highlight: {backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.5)},
        highlightBar: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
        highlightPinnedOrSaved: {
            backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.2),
        },
        pendingPost: {opacity: 0.5},
        postContent: {paddingHorizontal: 16},
        postStyle: {
            overflow: 'hidden',
            flex: 1,
        },
        profilePictureContainer: {
            marginBottom: 5,
            marginRight: 10,
            marginTop: 10,
        },
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
        },
        rightColumnPadding: {paddingBottom: 3},
    };
});

const DaakiaPost = ({
    appsEnabled,
    canDelete,
    currentUser,
    customEmojiNames,
    differentThreadSequence,
    hasFiles,
    hasReplies,
    highlight,
    highlightPinnedOrSaved = true,
    highlightReplyBar,
    isCRTEnabled,
    isConsecutivePost,
    isDMChannel,
    isEphemeral,
    isFirstReply,
    isSaved,
    isLastReply,
    isPostAcknowledgementEnabled,
    isPostAddChannelMember,
    isPostPriorityEnabled,
    location,
    post,
    rootId,
    hasReactions,
    searchPatterns,
    shouldRenderReplyButton,
    skipSavedHeader,
    skipPinnedHeader,
    showAddReaction = true,
    style,
    testID,
    thread,
    previousPost,
    isLastPost,
}: DaakiaPostProps) => {
    const pressDetected = useRef(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const isAutoResponder = fromAutoResponder(post);
    const isPendingOrFailed = isPostPendingOrFailed(post);
    const isFailed = isPostFailed(post);
    const isSystemPost = isSystemMessage(post);
    const isCallsPost = isCallsCustomMessage(post);
    const isLivekitPost = Boolean(post.props?.meeting_url);
    const hasBeenDeleted = (post.deleteAt !== 0);
    const isWebHook = isFromWebhook(post);
    const hasSameRoot = useMemo(() => {
        if (isFirstReply) {
            return false;
        } else if (!post.rootId && !previousPost?.rootId && isConsecutivePost) {
            return true;
        } else if (post.rootId) {
            return true;
        }

        return false;
    }, [isConsecutivePost, post, previousPost, isFirstReply]);
    const isJumboEmoji = useMemo(() => {
        if (post.message.length && !(/^\s{4}/).test(post.message)) {
            return hasJumboEmojiOnly(post.message, customEmojiNames);
        }
        return false;
    }, [customEmojiNames, post.message]);

    // Check if this is the current user's post
    const isMyPost = post.userId === currentUser?.id;

    const handlePostPress = useCallback(() => {
        if ([Screens.SAVED_MESSAGES, Screens.MENTIONS, Screens.SEARCH, Screens.PINNED_MESSAGES].includes(location)) {
            showPermalink(serverUrl, '', post.id);
            return;
        }

        const isValidSystemMessage = isAutoResponder || !isSystemPost;
        if (isEphemeral || hasBeenDeleted) {
            removePost(serverUrl, post);
        } else if (isValidSystemMessage && !hasBeenDeleted && !isPendingOrFailed) {
            if ([Screens.CHANNEL, Screens.PERMALINK].includes(location)) {
                // Only navigate to thread if post has a footer (replies or following)
                const hasFooter = isCRTEnabled && thread && location !== Screens.THREAD && !(rootId && location === Screens.PERMALINK) && (thread.replyCount > 0 || thread.isFollowing);
                
                if (hasFooter) {
                    const postRootId = post.rootId || post.id;
                    fetchAndSwitchToThread(serverUrl, postRootId);
                }
            }
        }

        setTimeout(() => {
            pressDetected.current = false;
        }, 300);
    }, [
        hasBeenDeleted, isAutoResponder, isEphemeral,
        isPendingOrFailed, isSystemPost, location, serverUrl, post,
        isCRTEnabled, thread, rootId,
    ]);

    const handlePress = useHideExtraKeyboardIfNeeded(() => {
        pressDetected.current = true;

        if (post) {
            setTimeout(handlePostPress, 300);
        }
    }, [handlePostPress, post]);

    const showPostOptions = useHideExtraKeyboardIfNeeded(() => {
        if (!post) {
            return;
        }

        if (isSystemPost && (!canDelete || hasBeenDeleted)) {
            return;
        }

        if (isPendingOrFailed || isEphemeral) {
            return;
        }

        Keyboard.dismiss();
        const passProps = {sourceScreen: location, post, showAddReaction, serverUrl};
        const title = isTablet ? intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}) : '';

        openAsBottomSheet({
            closeButtonId: 'close-post-options',
            screen: Screens.POST_OPTIONS,
            theme,
            title,
            props: passProps,
        });
    }, [
        canDelete, hasBeenDeleted, intl,
        isEphemeral, isPendingOrFailed, isTablet, isSystemPost,
        location, post, serverUrl, showAddReaction, theme,
    ]);

    const [, rerender] = useState(false);
    useEffect(() => {
        let t: NodeJS.Timeout|undefined;
        if (post.pendingPostId === post.id && !isFailed) {
            t = setTimeout(() => rerender(true), POST_TIME_TO_FAIL - (Date.now() - post.updateAt));
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [post.id]);

    useEffect(() => {
        if (!isLastPost) {
            return;
        }

        if (location !== 'Channel' && location !== 'Thread') {
            return;
        }

        PerformanceMetricsManager.finishLoad(location === 'Thread' ? 'THREAD' : 'CHANNEL', serverUrl);
        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl);
    }, []);

    const highlightSaved = isSaved && !skipSavedHeader;
    const hightlightPinned = post.isPinned && !skipPinnedHeader;
    const itemTestID = `${testID}.${post.id}`;
    const rightColumnStyle: StyleProp<ViewStyle> = [styles.rightColumn, (Boolean(post.rootId) && isLastReply && styles.rightColumnPadding), isMyPost ? {alignItems: 'flex-end'} : {alignItems: 'flex-start'}];
    const pendingPostStyle: StyleProp<ViewStyle> | undefined = isPendingOrFailed ? styles.pendingPost : undefined;

    // Dynamic container style based on who sent the message
    const containerDynamicStyle: StyleProp<ViewStyle> = isMyPost ? {justifyContent: 'flex-end'} : {justifyContent: 'flex-start'};

    let highlightedStyle: StyleProp<ViewStyle>;
    if (highlight) {
        highlightedStyle = styles.highlight;
    } else if ((highlightSaved || hightlightPinned) && highlightPinnedOrSaved) {
        highlightedStyle = styles.highlightPinnedOrSaved;
    }

    let header: ReactNode;
    let postAvatar: ReactNode;
    let consecutiveStyle: StyleProp<ViewStyle>;

    // If the post is a priority post:
    // 1. Show the priority label in channel screen
    // 2. Show the priority label in thread screen for the root post
    const showPostPriority = Boolean(isPostPriorityEnabled && post.metadata?.priority?.priority) && (location !== Screens.THREAD || !post.rootId);

    const sameSequence = hasReplies ? (hasReplies && post.rootId) : !post.rootId;

    // Avatar logic
    if (isDMChannel) {
        // Hide avatar in DM channels (both sides)
        postAvatar = null;
    } else if (isMyPost) {
        // Hide avatar for my posts in O, P, G channels
        postAvatar = null;
    } else if (!showPostPriority && hasSameRoot && isConsecutivePost && sameSequence) {
        consecutiveStyle = styles.consecutive;
        postAvatar = <View style={styles.consecutivePostContainer}/>;
    } else {
        postAvatar = (
            <View style={[styles.profilePictureContainer, pendingPostStyle]}>
                {(isAutoResponder || isSystemPost) ? (
                    <SystemAvatar theme={theme}/>
                ) : (
                    <Avatar
                        isAutoReponse={isAutoResponder}
                        location={location}
                        post={post}
                    />
                )}
            </View>
        );
    }

    // Header logic
    const shouldHideDisplayName = isDMChannel || isMyPost; // Hide name in DM or for my posts

    if (!showPostPriority && hasSameRoot && isConsecutivePost && sameSequence) {
        // Skip header for consecutive posts (all channels including DM)
        header = null;
    } else if (isSystemPost && !isAutoResponder) {
        header = (
            <SystemHeader
                createAt={post.createAt}
                theme={theme}
                isEphemeral={isEphemeral}
            />
        );
    } else {
        header = (
            <Header
                currentUser={currentUser}
                differentThreadSequence={differentThreadSequence}
                hideDisplayName={shouldHideDisplayName}
                isAutoResponse={isAutoResponder}
                isCRTEnabled={isCRTEnabled}
                isEphemeral={isEphemeral}
                isPendingOrFailed={isPendingOrFailed}
                isSystemPost={isSystemPost}
                isWebHook={isWebHook}
                location={location}
                post={post}
                showPostPriority={showPostPriority}
                shouldRenderReplyButton={shouldRenderReplyButton}
            />
        );
    }

    // TEMP LOGS: dump post data to inspect plugin payloads and authors (Daakia UI)
    // eslint-disable-next-line no-console
    // console.log('[DAAKIA_POST_RENDER]', {
    //     id: post.id,
    //     channelId: post.channelId,
    //     userId: post.userId,
    //     type: post.type,
    //     message: post.message,
    //     props: post.props,
    //     metadata: post.metadata,
    // });

    // Example filter: plugin/webhook/app-originated posts
    const hasAppId = Boolean(post.props && ('app_id' in post.props));
    if (post.props?.from_webhook || post.props?.attachments || hasAppId) {
        // eslint-disable-next-line no-console
        // console.log('[DAAKIA_PLUGIN_POST]', {id: post.id, props: post.props, message: post.message});
    }

    // Example filter: by specific author userId (replace with Sumeet's userId to enable)
    // if (post.userId === 'USER_ID_FOR_SUMEET') {
    //     // eslint-disable-next-line no-console
    //     console.log('[DAAKIA_SUMEET_POST]', {id: post.id, type: post.type, props: post.props, message: post.message});
    // }

    let body;
    if (isSystemPost && !isEphemeral && !isAutoResponder) {
        body = (
            <SystemMessage
                location={location}
                post={post}
            />
        );
    } else if (isCallsPost && !hasBeenDeleted) {
        body = (
            <>
                <View style={{height: 5}}/>
                <CallsCustomMessage
                    serverUrl={serverUrl}
                    post={post}

                    // Note: the below are provided by the index, but typescript seems to be having problems.
                    otherParticipants={false}
                    isAdmin={false}
                    isHost={false}
                    joiningChannelId={null}
                />
                <View style={{height: 5}}/>
            </>
        );
    } else if (isLivekitPost && !hasBeenDeleted) {
        body = (
            <>
                <View style={{height: 5}}/>
                <LivekitCustomMessage
                    post={post}
                />
                <View style={{height: 5}}/>
            </>
        );
    } else {
        body = (
            <Body
                appsEnabled={appsEnabled}
                hasFiles={hasFiles}
                hasReactions={hasReactions}
                highlight={Boolean(highlightedStyle)}
                highlightReplyBar={highlightReplyBar}
                isCRTEnabled={isCRTEnabled}
                isEphemeral={isEphemeral}
                isFirstReply={isFirstReply}
                isJumboEmoji={isJumboEmoji}
                isLastReply={isLastReply}
                isMyPost={isMyPost}
                isPendingOrFailed={isPendingOrFailed}
                isPostAcknowledgementEnabled={isPostAcknowledgementEnabled}
                isPostAddChannelMember={isPostAddChannelMember}
                location={location}
                post={post}
                searchPatterns={searchPatterns}
                showAddReaction={showAddReaction}
                theme={theme}
            />
        );
    }

    let unreadDot;
    let footer;
    if (isCRTEnabled && thread && location !== Screens.THREAD && !(rootId && location === Screens.PERMALINK)) {
        if (thread.unreadMentions || thread.unreadReplies) {
            unreadDot = (
                <UnreadDot isInFooter={true}/>
            );
        }
        if (thread.replyCount > 0 || thread.isFollowing) {
            footer = (
                <Footer
                    channelId={post.channelId}
                    location={location}
                    thread={thread}
                    isMyPost={isMyPost}
                    unreadDot={unreadDot}
                />
            );
        }
    }

    return (
        <View
            testID={testID}
            style={[styles.postStyle, style, highlightedStyle]}
        >
            <TouchableHighlight
                testID={itemTestID}
                onPress={handlePress}
                onLongPress={showPostOptions}
                delayLongPress={200}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                style={styles.postContent}
            >
                <>
                    <PreHeader
                        isConsecutivePost={isConsecutivePost}
                        isSaved={isSaved}
                        isPinned={post.isPinned}
                        skipSavedHeader={skipSavedHeader}
                        skipPinnedHeader={skipPinnedHeader}
                        alignRight={isMyPost}
                    />
                    <View style={[styles.container, containerDynamicStyle, consecutiveStyle]}>
                        {isMyPost ? null : postAvatar}
                        <View style={rightColumnStyle}>
                            {header}
                            {body}
                            {footer}
                        </View>
                        {isMyPost ? postAvatar : null}
                    </View>
                </>
            </TouchableHighlight>
        </View>
    );
};

export default DaakiaPost;
