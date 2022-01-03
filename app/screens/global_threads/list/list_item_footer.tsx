// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import AvatarsStack from '@app/components/avatars_stack';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export type Props = {
    currentUserId: $ID<UserProfile>;
    testID: string;
    thread: Thread;
    threadStarter: UserProfile;
    theme: Theme;
};

function ThreadFooter({testID, theme, thread, threadStarter}: Props) {
    const style = getStyleSheet(theme);

    let repliesComponent;
    if (thread.unread_replies) {
        repliesComponent = (
            <FormattedText
                id={'threads.newReplies'}
                defaultMessage={'{count} new {count, plural, one {reply} other {replies}}'}
                style={style.unreadReplies}
                testID={`${testID}.unread_replies`}
                values={{
                    count: thread.unread_replies,
                }}
            />
        );
    } else if (thread.reply_count) {
        repliesComponent = (
            <FormattedText
                id={'threads.replies'}
                defaultMessage={'{count} {count, plural, one {reply} other {replies}}'}
                style={style.replies}
                testID={`${testID}.reply_count`}
                values={{
                    count: thread.reply_count,
                }}
            />
        );
    }

    // threadstarter should be the first one in the avatars list
    const participants = React.useMemo(() => {
        if (thread.participants?.length) {
            const participantIds = thread.participants.filter((participant) => participant.id !== threadStarter.id).reverse();
            participantIds.unshift(threadStarter?.id);
            return participantIds;
        }
        return [];
    }, [thread.participants, threadStarter]);

    let avatars;
    if (participants.length) {
        avatars = (
            <AvatarsStack
                style={style.avatarsContainer}
                userIds={participants}
            />
        );
    }

    return (
        <View style={style.container}>
            {avatars}
            {repliesComponent}
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
