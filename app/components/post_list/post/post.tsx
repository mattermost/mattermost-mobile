// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useRef} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, StyleProp, View, ViewStyle} from 'react-native';

import {showPermalink} from '@actions/local/permalink';
import {removePost} from '@actions/local/post';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import * as Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {showModalOverCurrentContext} from '@screens/navigation';
import {fromAutoResponder, isFromWebhook, isPostPendingOrFailed, isSystemMessage} from '@utils/post';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Avatar from './avatar';
import Body from './body';
import Header from './header';
import PreHeader from './pre_header';
import SystemMessage from './system_message';

import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type PostProps = {
    appsEnabled: boolean;
    canDelete: boolean;
    currentUser: UserModel;
    differentThreadSequence: boolean;
    files: FileModel[];
    highlight?: boolean;
    highlightPinnedOrFlagged?: boolean;
    highlightReplyBar: boolean;
    isConsecutivePost?: boolean;
    isEphemeral: boolean;
    isFirstReply?: boolean;
    isFlagged?: boolean;
    isJumboEmoji: boolean;
    isLastReply?: boolean;
    isPostAddChannelMember: boolean;
    location: string;
    post: PostModel;
    reactionsCount: number;
    shouldRenderReplyButton?: boolean;
    showAddReaction?: boolean;
    skipFlaggedHeader?: boolean;
    skipPinnedHeader?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        consecutive: {marginTop: 0},
        consecutivePostContainer: {
            marginBottom: 10,
            marginRight: 10,
            marginLeft: 47,
            marginTop: 10,
        },
        container: {flexDirection: 'row'},
        highlight: {backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.5)},
        highlightBar: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
        highlightPinnedOrFlagged: {backgroundColor: changeOpacity(theme.mentionHighlightBg, 0.2)},
        pendingPost: {opacity: 0.5},
        postStyle: {
            overflow: 'hidden',
            flex: 1,
        },
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
        rightColumn: {
            flex: 1,
            flexDirection: 'column',
            marginRight: 12,
        },
        rightColumnPadding: {paddingBottom: 3},
    };
});

const Post = ({
    appsEnabled, canDelete, currentUser, differentThreadSequence, files, highlight, highlightPinnedOrFlagged = true, highlightReplyBar,
    isConsecutivePost, isEphemeral, isFirstReply, isFlagged, isJumboEmoji, isLastReply, isPostAddChannelMember,
    location, post, reactionsCount, shouldRenderReplyButton, skipFlaggedHeader, skipPinnedHeader, showAddReaction = true, style,
    testID,
}: PostProps) => {
    const pressDetected = useRef(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isAutoResponder = fromAutoResponder(post);
    const isPendingOrFailed = isPostPendingOrFailed(post);
    const isSystemPost = isSystemMessage(post);
    const isWebHook = isFromWebhook(post);

    const handlePress = preventDoubleTap(() => {
        pressDetected.current = true;

        if (post) {
            if (location === Screens.THREAD) {
                Keyboard.dismiss();
            } else if (location === Screens.SEARCH) {
                showPermalink(serverUrl, '', post.id, intl);
                return;
            }

            const isValidSystemMessage = isAutoResponder || !isSystemPost;
            if (post.deleteAt !== 0 && isValidSystemMessage && !isPendingOrFailed) {
                if ([Screens.CHANNEL, Screens.PERMALINK].includes(location)) {
                    DeviceEventEmitter.emit('goToThread', post);
                }
            } else if ((isEphemeral || post.deleteAt > 0)) {
                removePost(serverUrl, post);
            }

            const pressTimeout = setTimeout(() => {
                pressDetected.current = false;
                clearTimeout(pressTimeout);
            }, 300);
        }
    });

    const showPostOptions = () => {
        if (!post) {
            return;
        }

        const hasBeenDeleted = (post.deleteAt !== 0);
        if (isSystemPost && (!canDelete || hasBeenDeleted)) {
            return;
        }

        if (isPendingOrFailed || isEphemeral) {
            return;
        }

        const screen = 'PostOptions';
        const passProps = {
            location,
            post,
            showAddReaction,
        };

        Keyboard.dismiss();
        const postOptionsRequest = requestAnimationFrame(() => {
            showModalOverCurrentContext(screen, passProps);
            cancelAnimationFrame(postOptionsRequest);
        });
    };

    const highlightFlagged = isFlagged && !skipFlaggedHeader;
    const hightlightPinned = post.isPinned && !skipPinnedHeader;
    const itemTestID = `${testID}.${post.id}`;
    const rightColumnStyle = [styles.rightColumn, (post.rootId && isLastReply && styles.rightColumnPadding)];
    const pendingPostStyle: StyleProp<ViewStyle> | undefined = isPendingOrFailed ? styles.pendingPost : undefined;

    let highlightedStyle: StyleProp<ViewStyle>;
    if (highlight) {
        highlightedStyle = styles.highlight;
    } else if ((highlightFlagged || hightlightPinned) && highlightPinnedOrFlagged) {
        highlightedStyle = styles.highlightPinnedOrFlagged;
    }

    let header: ReactNode;
    let postAvatar: ReactNode;
    let consecutiveStyle: StyleProp<ViewStyle>;
    if (isConsecutivePost) {
        consecutiveStyle = styles.consective;
        postAvatar = <View style={styles.consecutivePostContainer}/>;
    } else {
        postAvatar = isAutoResponder ? (
            <SystemAvatar theme={theme}/>
        ) : (
            <Avatar
                isAutoReponse={isAutoResponder}
                isSystemPost={isSystemPost}
                pendingPostStyle={pendingPostStyle}
                post={post}
            />
        );

        if (isSystemPost && !isAutoResponder) {
            header = (
                <SystemHeader
                    createAt={post.createAt}
                    theme={theme}
                />
            );
        } else {
            header = (
                <Header
                    currentUser={currentUser}
                    differentThreadSequence={differentThreadSequence}
                    isAutoResponse={isAutoResponder}
                    isEphemeral={isEphemeral}
                    isPendingOrFailed={isPendingOrFailed}
                    isSystemPost={isSystemPost}
                    isWebHook={isWebHook}
                    location={location}
                    post={post}
                    shouldRenderReplyButton={shouldRenderReplyButton}
                />
            );
        }
    }

    let body;
    if (isSystemPost && !isEphemeral && !isAutoResponder) {
        body = (
            <SystemMessage
                post={post}
            />
        );
    } else {
        body = (
            <Body
                appsEnabled={appsEnabled}
                files={files}
                hasReactions={reactionsCount > 0}
                highlight={Boolean(highlightedStyle)}
                highlightReplyBar={highlightReplyBar}
                isEphemeral={isEphemeral}
                isFirstReply={isFirstReply}
                isJumboEmoji={isJumboEmoji}
                isLastReply={isLastReply}
                isPendingOrFailed={isPendingOrFailed}
                isPostAddChannelMember={isPostAddChannelMember}
                location={location}
                post={post}
                showAddReaction={showAddReaction}
                theme={theme}
            />
        );
    }

    return (
        <View
            testID={testID}
            style={[styles.postStyle, style, highlightedStyle]}
        >
            <TouchableWithFeedback
                testID={itemTestID}
                onPress={handlePress}
                onLongPress={showPostOptions}
                delayLongPress={200}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                cancelTouchOnPanning={true}
            >
                <>
                    <PreHeader
                        isConsecutivePost={isConsecutivePost}
                        isFlagged={isFlagged}
                        isPinned={post.isPinned}
                        skipFlaggedHeader={skipFlaggedHeader}
                        skipPinnedHeader={skipPinnedHeader}
                    />
                    <View style={[styles.container, consecutiveStyle]}>
                        {postAvatar}
                        <View style={rightColumnStyle}>
                            {header}
                            {body}
                        </View>
                    </View>
                </>
            </TouchableWithFeedback>
        </View>
    );
};

export default React.memo(Post);
