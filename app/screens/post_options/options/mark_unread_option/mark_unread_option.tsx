// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {markPostAsUnread} from '@actions/remote/post';
import {markThreadAsUnread} from '@actions/remote/thread';
import {BaseOption} from '@components/common_post_options';
import Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    location: typeof Screens[keyof typeof Screens];
    post: PostModel;
    teamId: string;
}

const MarkAsUnreadOption = ({location, post, teamId}: Props) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        if (location === Screens.THREAD) {
            const threadId = post.rootId || post.id;
            markThreadAsUnread(serverUrl, teamId, threadId, post.id);
        } else {
            markPostAsUnread(serverUrl, post.id);
        }
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [location, post, serverUrl, teamId]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.mark_unread')}
            defaultMessage='Mark as Unread'
            iconName='mark-as-unread'
            onPress={onPress}
            testID='post_options.mark.unread.option'
        />
    );
};

export default MarkAsUnreadOption;
