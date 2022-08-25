// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    channelId: string;
    location: string;
    participants: UserModel[];
    testID: string;
    thread: ThreadModel;
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
        replies: {
            alignSelf: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            marginRight: 12,
            ...typography('Body', 75, 'SemiBold'),
        },
        unreadReplies: {
            alignSelf: 'center',
            color: theme.sidebarTextActiveBorder,
            marginRight: 12,
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

const ThreadFooter = ({author, channelId, location, participants, testID, thread}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    let repliesComponent;
    if (thread.unreadReplies) {
        repliesComponent = (
            <FormattedText
                id='threads.newReplies'
                defaultMessage='{count} new {count, plural, one {reply} other {replies}}'
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
                id='threads.replies'
                defaultMessage='{count} {count, plural, one {reply} other {replies}}'
                style={style.replies}
                testID={`${testID}.reply_count`}
                values={{
                    count: thread.replyCount,
                }}
            />
        );
    }

    // threadstarter should be the first one in the avatars list
    const participantsList = useMemo(() => {
        if (author && participants?.length) {
            const filteredParticipantsList = participants.filter((participant) => participant.id !== author.id).reverse();
            filteredParticipantsList.unshift(author);
            return filteredParticipantsList;
        }
        return [];
    }, [participants, author]);

    let userAvatarsStack;
    if (author && participantsList.length) {
        userAvatarsStack = (
            <UserAvatarsStack
                channelId={channelId}
                location={location}
                style={style.avatarsContainer}
                users={participantsList}
            />
        );
    }

    return (
        <View style={style.container}>
            {userAvatarsStack}
            {repliesComponent}
        </View>
    );
};

export default ThreadFooter;
