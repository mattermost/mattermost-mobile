// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {markPostAsUnread} from '@actions/remote/post';
import {BaseOption} from '@components/common_post_options';
import Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

type Props = {
    postId: string;
}

const MarkAsUnreadOption = ({postId}: Props) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet(Screens.POST_OPTIONS);
        markPostAsUnread(serverUrl, postId);
    }, [serverUrl, postId]);

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
