// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    threadId: string;
}

const messages = defineMessages({
    openInChannel: {
        id: 'global_threads.options.open_in_channel',
        defaultMessage: 'Open in Channel',
    },
});
const OpenInChannelOption = ({bottomSheetId, threadId}: Props) => {
    const serverUrl = useServerUrl();

    const onHandlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);
        showPermalink(serverUrl, '', threadId);
    }, [bottomSheetId, serverUrl, threadId]);

    return (
        <BaseOption
            message={messages.openInChannel}
            iconName='globe'
            onPress={onHandlePress}
            testID='thread_options.open_in_channel.option'
        />
    );
};

export default OpenInChannelOption;
