// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import Avatars from '@components/avatars';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import type {Theme} from '@mm-redux/types/preferences';
import type {GlobalState} from '@mm-redux/types/store';
import { UserProfile } from '@mm-redux/types/users';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import { UserThread } from '@mm-redux/types/threads';

type Props = {
    intl: typeof intlShape;
    threadStarter: UserProfile;
    thread: UserThread;
}

function ThreadFooter({intl, thread, threadStarter}: Props) {
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const style = getStyleSheet(theme);

    // threadstarter should be the first one in the avatars list
    const participants = thread.participants.flatMap((participant) => (participant.id === threadStarter?.id ? [] : participant.id));
    participants?.unshift(threadStarter?.id);

    let repliesComponent;
    if (thread.unread_replies) {
        repliesComponent = (
            <Text style={style.unreadReplies}>
                {intl.formatMessage({
                    id: 'threads.newReplies',
                    defaultMessage: '{count} new {count, plural, one {reply} other {replies}}',
                }, {
                    count: thread.unread_replies,
                })}
            </Text>
        );
    } else {
        repliesComponent = (
            <Text style={style.replies}>
                {intl.formatMessage({
                    id: 'threads.replies',
                    defaultMessage: '{count} {count, plural, one {reply} other {replies}}',
                }, {
                    count: thread.reply_count,
                })}
            </Text>
        );
    }

    return (
        <View style={style.footerContainer}>
            <View style={style.avatarsContainer}>
                <Avatars
                    style={style.avatars}
                    userIds={participants}
                />
            </View>
            {repliesComponent}
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        footerContainer: {
            flexDirection: 'row',
        },
        avatarsContainer: {
            marginRight: 12,
        },
        avatars: {flex: 1},
        replies: {
            alignSelf: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        unreadReplies: {
            alignSelf: 'center',
            color: theme.sidebarTextActiveBorder,
        },
    };
});

export default injectIntl(ThreadFooter);
