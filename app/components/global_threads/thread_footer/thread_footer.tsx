// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {intlShape} from 'react-intl';

import Avatars from '@components/avatars';
import CompassIcon from '@components/compass_icon';
import type {Theme} from '@mm-redux/types/preferences';
import {Team} from '@mm-redux/types/teams';
import {UserThread} from '@mm-redux/types/threads';
import {UserProfile} from '@mm-redux/types/users';
import {$ID} from '@mm-redux/types/utilities';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const NO_PARTICIPANTS: object[] = [];

export type DispatchProps = {
    actions: {
        setThreadFollow: (currentUserId: $ID<UserProfile>, currentTeamId: $ID<Team>, threadId: $ID<UserThread>, newState: boolean) => void;
    };
};

export type OwnProps = {
    location: 'globalThreads' | 'channel';
    testID: string;
    thread: UserThread;
    threadStarter: UserProfile;
    theme: Theme;
}

export type StateProps = {
    currentTeamId: $ID<Team>;
    currentUserId: $ID<UserProfile>;
};

export type Props = DispatchProps & OwnProps & StateProps & {
    intl: typeof intlShape;
};

function ThreadFooter({actions, currentTeamId, currentUserId, intl, location, testID, theme, thread, threadStarter}: Props) {
    const style = getStyleSheet(theme);

    const onUnfollow = () => {
        actions.setThreadFollow(currentUserId, currentTeamId, thread.id, false);
    };

    const onFollow = () => {
        actions.setThreadFollow(currentUserId, currentTeamId, thread.id, true);
    };

    let replyIcon;
    let followButton;
    if (location === 'channel') {
        if (thread.reply_count) {
            replyIcon = (
                <View style={style.replyIconContainer}>
                    <CompassIcon
                        name='reply-outline'
                        size={18}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </View>
            );
        }
        if (thread.is_following) {
            followButton = (
                <TouchableOpacity
                    onPress={preventDoubleTap(onUnfollow)}
                    style={style.followingButtonContainer}
                    testID={`${testID}.following`}
                >
                    <Text style={style.following}>
                        {intl.formatMessage({
                            id: 'threads.following',
                            defaultMessage: 'Following',
                        })}
                    </Text>
                </TouchableOpacity>
            );
        } else {
            followButton = (
                <>
                    <View style={style.followSeparator}/>
                    <TouchableOpacity
                        onPress={preventDoubleTap(onFollow)}
                        style={style.notFollowingButtonContainer}
                        testID={`${testID}.follow`}
                    >
                        <Text style={style.notFollowing}>
                            {intl.formatMessage({
                                id: 'threads.follow',
                                defaultMessage: 'Follow',
                            })}
                        </Text>
                    </TouchableOpacity>
                </>
            );
        }
    }

    let repliesComponent;
    if (location === 'globalThreads' && thread.unread_replies) {
        repliesComponent = (
            <Text
                style={style.unreadReplies}
                testID={`${testID}.unread_replies`}
            >
                {intl.formatMessage({
                    id: 'threads.newReplies',
                    defaultMessage: '{count} new {count, plural, one {reply} other {replies}}',
                }, {
                    count: thread.unread_replies,
                })}
            </Text>
        );
    } else if (thread.reply_count) {
        repliesComponent = (
            <Text
                style={style.replies}
                testID={`${testID}.reply_count`}
            >
                {intl.formatMessage({
                    id: 'threads.replies',
                    defaultMessage: '{count} {count, plural, one {reply} other {replies}}',
                }, {
                    count: thread.reply_count,
                })}
            </Text>
        );
    }

    // threadstarter should be the first one in the avatars list
    const participants = thread.participants?.flatMap((participant) => (participant.id === threadStarter?.id ? [] : participant.id)) || NO_PARTICIPANTS;
    participants?.unshift(threadStarter?.id);
    let avatars;
    if (participants.length) {
        avatars = (
            <Avatars
                style={style.avatarsContainer}
                userIds={participants}
            />
        );
    }

    // Hide footer, when user follows and then unfollows a thread without any replies
    if (location === 'channel' && !participants.length && thread.reply_count && !thread.is_following) {
        return null;
    }

    return (
        <View style={style.container}>
            {avatars}
            {replyIcon}
            {repliesComponent}
            {followButton}
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const followingButtonContainerBase = {
        justifyContent: 'center',
        height: 32,
        paddingHorizontal: 12,
    };

    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 40,
        },
        avatarsContainer: {
            marginRight: 12,
            paddingVertical: 8,
        },
        replyIconContainer: {
            top: -1,
            marginRight: 5,
        },
        replies: {
            alignSelf: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 12,
            fontWeight: '600',
            marginRight: 12,
        },
        unreadReplies: {
            alignSelf: 'center',
            color: theme.sidebarTextActiveBorder,
            fontSize: 12,
            fontWeight: '600',
            marginRight: 12,
        },
        notFollowingButtonContainer: {
            ...followingButtonContainerBase,
            paddingLeft: 0,
        },
        notFollowing: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontWeight: '600',
            fontSize: 12,
        },
        followingButtonContainer: {
            ...followingButtonContainerBase,
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        following: {
            color: theme.buttonBg,
            fontWeight: '600',
            fontSize: 12,
        },
        followSeparator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
            height: 16,
            marginRight: 12,
            width: 1,
        },
    };
});

export default ThreadFooter;
