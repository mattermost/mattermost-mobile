// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';
import BaseOption from '@screens/post_options/options/base_option';

type Props = {
    threadId: string;
}
const ReplyOption = ({threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(Screens.THREAD_OPTIONS);
        fetchAndSwitchToThread(serverUrl, threadId);
    }, [serverUrl, threadId]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.reply')}
            defaultMessage='Reply'
            iconName='reply-outline'
            onPress={onHandlePress}
            testID='thread.options.reply'
        />
    );
};

export default ReplyOption;
