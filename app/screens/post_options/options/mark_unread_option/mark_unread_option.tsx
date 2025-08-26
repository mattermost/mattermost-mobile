// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {markPostAsUnread} from '@actions/remote/post';
import {markThreadAsUnread} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    isCRTEnabled: boolean;
    sourceScreen: AvailableScreens;
    post: PostModel;
    teamId: string;
}

const messages = defineMessages({
    markAsUnread: {
        id: 'mobile.post_info.mark_unread',
        defaultMessage: 'Mark as Unread',
    },
});

const MarkAsUnreadOption = ({bottomSheetId, isCRTEnabled, sourceScreen, post, teamId}: Props) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        if (sourceScreen === Screens.THREAD && isCRTEnabled) {
            const threadId = post.rootId || post.id;
            markThreadAsUnread(serverUrl, teamId, threadId, post.id);
        } else {
            markPostAsUnread(serverUrl, post.id);
        }
    }, [bottomSheetId, sourceScreen, isCRTEnabled, post.rootId, post.id, serverUrl, teamId]);

    return (
        <BaseOption
            message={messages.markAsUnread}
            iconName='mark-as-unread'
            onPress={onPress}
            testID='post_options.mark_as_unread.option'
        />
    );
};

export default MarkAsUnreadOption;
