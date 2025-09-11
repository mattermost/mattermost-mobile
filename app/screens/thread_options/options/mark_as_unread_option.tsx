// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {markThreadAsRead, markThreadAsUnread} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type ThreadModel from '@typings/database/models/servers/thread';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    teamId: string;
    thread: ThreadModel;
}

const messages = defineMessages({
    markAsRead: {
        id: 'global_threads.options.mark_as_read',
        defaultMessage: 'Mark as Read',
    },
    markAsUnread: {
        id: 'mobile.post_info.mark_unread',
        defaultMessage: 'Mark as Unread',
    },
});

const MarkAsUnreadOption = ({bottomSheetId, teamId, thread}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        if (thread.unreadReplies) {
            markThreadAsRead(serverUrl, teamId, thread.id);
        } else {
            markThreadAsUnread(serverUrl, teamId, thread.id, thread.id);
        }
    }, [bottomSheetId, serverUrl, teamId, thread]);

    const message = thread.unreadReplies ? messages.markAsRead : messages.markAsUnread;
    const markAsUnreadTestId = thread.unreadReplies ? 'thread_options.mark_as_read.option' : 'thread_options.mark_as_unread.option';

    return (
        <BaseOption
            message={message}
            iconName='mark-as-unread'
            onPress={onHandlePress}
            testID={markAsUnreadTestId}
        />
    );
};

export default MarkAsUnreadOption;
