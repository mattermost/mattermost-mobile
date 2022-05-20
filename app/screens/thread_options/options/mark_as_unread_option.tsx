// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {markThreadAsRead, markThreadAsUnread} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    teamId: string;
    thread: ThreadModel;
}
const MarkAsUnreadOption = ({teamId, thread}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(Screens.THREAD_OPTIONS);
        if (thread.unreadReplies) {
            markThreadAsRead(serverUrl, teamId, thread.id);
        } else {
            markThreadAsUnread(serverUrl, teamId, thread.id, thread.id);
        }
    }, [serverUrl, teamId, thread]);

    const id = thread.unreadReplies ? t('global_threads.options.mark_as_read') : t('mobile.post_info.mark_unread');
    const defaultMessage = thread.unreadReplies ? 'Mark as Read' : 'Mark as Unread';
    const markAsUnreadTestId = thread.unreadReplies ? 'thread_options.mark_as_read.option' : 'thread_options.mark_as_unread.option';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='mark-as-unread'
            onPress={onHandlePress}
            testID={markAsUnreadTestId}
        />
    );
};

export default MarkAsUnreadOption;
