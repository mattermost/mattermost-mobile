// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import AvatarsStack from '@components/avatars_stack';
import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

export type Props = {
    author: UserModel;
    currentUserId: string;
    participants: UserModel[];
    teammateNameDisplay: string;
    testID: string;
    thread: ThreadModel;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
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
    };
});

const ThreadFooter = ({author, currentUserId, participants, teammateNameDisplay, testID, theme, thread}: Props) => {
    const style = getStyleSheet(theme);

    let repliesComponent;
    if (thread.unreadReplies) {
        repliesComponent = (
            <FormattedText
                id={'threads.newReplies'}
                defaultMessage={'{count} new {count, plural, one {reply} other {replies}}'}
                style={style.unreadReplies}
                testID={`${testID}.unread_replies`}
                values={{
                    count: thread.unreadReplies,
                }}
            />
        );
    } else if (thread.replyCount) {
        repliesComponent = (
            <FormattedText
                id={'threads.replies'}
                defaultMessage={'{count} {count, plural, one {reply} other {replies}}'}
                style={style.replies}
                testID={`${testID}.reply_count`}
                values={{
                    count: thread.replyCount,
                }}
            />
        );
    }

    // threadstarter should be the first one in the avatars list
    const participantsList = React.useMemo(() => {
        if (participants?.length) {
            const filteredParticipantsList = participants.filter((participant) => participant.id !== author.id).reverse();
            filteredParticipantsList.unshift(author);
            return filteredParticipantsList;
        }
        return [];
    }, [participants, author]);

    let avatars;
    if (participantsList.length) {
        avatars = (
            <AvatarsStack
                currentUserId={currentUserId}
                style={style.avatarsContainer}
                teammateNameDisplay={teammateNameDisplay}
                users={participantsList}
            />
        );
    }

    return (
        <View style={style.container}>
            {avatars}
            {repliesComponent}
        </View>
    );
};

export default ThreadFooter;
