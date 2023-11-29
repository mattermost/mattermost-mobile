// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {updateChannelNotifyProps} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {
    CHANNEL_AUTO_FOLLOW_THREADS_FALSE,
    CHANNEL_AUTO_FOLLOW_THREADS_TRUE,
} from '@constants/channel';
import {useServerUrl} from '@context/server';
import {alertErrorWithFallback} from '@utils/draft';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    followedStatus: boolean;
    displayName: string;
};

const AutoFollowThreads = ({channelId, displayName, followedStatus}: Props) => {
    const [autoFollow, setAutoFollow] = useState(followedStatus);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const toggleFollow = preventDoubleTap(async () => {
        const props: Partial<ChannelNotifyProps> = {
            channel_auto_follow_threads: followedStatus ? CHANNEL_AUTO_FOLLOW_THREADS_FALSE : CHANNEL_AUTO_FOLLOW_THREADS_TRUE,
        };
        setAutoFollow((v) => !v);
        const result = await updateChannelNotifyProps(serverUrl, channelId, props);
        if (result?.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                defineMessage({
                    id: 'channel_info.channel_auto_follow_threads_failed',
                    defaultMessage: 'An error occurred trying to auto follow all threads in channel {displayName}',
                }),
                {displayName},
            );
            setAutoFollow((v) => !v);
        }
    });

    return (
        <OptionItem
            action={toggleFollow}
            label={intl.formatMessage({id: 'channel_info.channel_auto_follow_threads', defaultMessage: 'Follow all threads in this channel'})}
            icon='message-plus-outline'
            type='toggle'
            selected={autoFollow}
            testID={`channel_info.options.channel_auto_follow_threads.option.toggled.${autoFollow}`}
        />
    );
};

export default AutoFollowThreads;
