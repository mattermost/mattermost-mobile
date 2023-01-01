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
    bottomSheetId: typeof Screens[keyof typeof Screens];
    isCRTEnabled: boolean;
    sourceScreen: typeof Screens[keyof typeof Screens];
    post: PostModel;
    teamId: string;
}

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
    }, [bottomSheetId, sourceScreen, post, serverUrl, teamId]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.mark_unread')}
            defaultMessage='Mark as Unread'
            iconName='mark-as-unread'
            onPress={onPress}
            testID='post_options.mark_as_unread.option'
        />
    );
};

export default MarkAsUnreadOption;
