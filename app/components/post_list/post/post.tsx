// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, StyleProp, View, ViewStyle} from 'react-native';

import {showPermalink} from '@actions/local/permalink';
import {removePost} from '@actions/local/post';
import SystemAvatar from '@components/system_avatar';
import SystemHeader from '@components/system_header';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import * as Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
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
    hasReplies: boolean;
    highlight?: boolean;
    highlightPinnedOrSaved?: boolean;
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
    previousPost?: PostModel;
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
            marginLeft: Platform.select({ios: 35, android: 34}),
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
        postStyle: {
            overflow: 'hidden',
            flex: 1,
            paddingHorizontal: 20,
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

const Post = ({
    appsEnabled, canDelete, currentUser, differentThreadSequence, files, hasReplies, highlight, highlightPinnedOrSaved = true, highlightReplyBar,
    isConsecutivePost, isEphemeral, isFirstReply, isFlagged, isJumboEmoji, isLastReply, isPostAddChannelMember,
    location, post, reactionsCount, shouldRenderReplyButton, skipFlaggedHeader, skipPinnedHeader, showAddReaction = true, style,
    testID, previousPost,
}: PostProps) => {
    const pressDetected = useRef(false);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);
    const isAutoResponder = fromAutoResponder(post);
    const isPendingOrFailed = isPostPendingOrFailed(post);
    const isSystemPost = isSystemMessage(post);
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

        Keyboard.dismiss();

        const passProps = {location, post};
        const title = isTablet ? intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}) : '';

        if (isTablet) {
            showModal(Screens.POST_OPTIONS, title, passProps, bottomSheetModalOptions(theme, 'close-post-options'));
        } else {
            showModalOverCurrentContext(Screens.POST_OPTIONS, passProps);
        }
    };

    const highlightFlagged = isFlagged && !skipFlaggedHeader;
    const hightlightPinned = post.isPinned && !skipPinnedHeader;
    const itemTestID = `${testID}.${post.id}`;
    const rightColumnStyle = [styles.rightColumn, (post.rootId && isLastReply && styles.rightColumnPadding)];
    const pendingPostStyle: StyleProp<ViewStyle> | undefined = isPendingOrFailed ? styles.pendingPost : undefined;

    let highlightedStyle: StyleProp<ViewStyle>;
    if (highlight) {
        highlightedStyle = styles.highlight;
    } else if ((highlightFlagged || hightlightPinned) && highlightPinnedOrSaved) {
        highlightedStyle = styles.highlightPinnedOrSaved;
    }

    let header: ReactNode;
    let postAvatar: ReactNode;
    let consecutiveStyle: StyleProp<ViewStyle>;
    const sameSecuence = hasReplies ? (hasReplies && post.rootId) : !post.rootId;
    if (hasSameRoot && isConsecutivePost && sameSecuence) {
        consecutiveStyle = styles.consective;
        postAvatar = <View style={styles.consecutivePostContainer}/>;
    } else {
        postAvatar = (
            <View style={[styles.profilePictureContainer, pendingPostStyle]}>
                {isAutoResponder ? (
                    <SystemAvatar theme={theme}/>
                ) : (
                    <Avatar
                        isAutoReponse={isAutoResponder}
                        isSystemPost={isSystemPost}
                        post={post}
                    />
                )}
            </View>
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

export default Post;
