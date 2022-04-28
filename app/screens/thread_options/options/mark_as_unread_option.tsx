// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {updateThreadRead} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    post: PostModel;
    teamId: string;
    thread: ThreadModel;
}
const MarkAsUnreadOption = ({teamId, thread, post}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        const timestamp = thread.unreadReplies ? Date.now() : post.createAt;
        updateThreadRead(serverUrl, teamId, thread.id, timestamp);
        dismissBottomSheet(Screens.THREAD_OPTIONS);
    }, [serverUrl, thread]);

    const id = thread.unreadReplies ? t('global_threads.options.mark_as_read') : t('mobile.post_info.mark_unread');
    const defaultMessage = thread.unreadReplies ? 'Mark as Read' : 'Mark as Unread';

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='mark-as-unread'
            onPress={onHandlePress}
            testID='thread.options.mark_as_read'
        />
    );
};

export default MarkAsUnreadOption;
