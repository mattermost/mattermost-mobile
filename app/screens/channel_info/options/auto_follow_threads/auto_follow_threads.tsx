// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import {updateChannelNotifyProps} from '@actions/remote/channel';
import OptionItem from '@app/components/option_item';
import {useServerUrl} from '@app/context/server';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    followedStatus: boolean;
};

const AutoFollowThreads = ({channelId, followedStatus}: Props) => {
    const [autoFollow, setAutoFollow] = useState(followedStatus);
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();

    const toggleFollow = preventDoubleTap(() => {
        const props: Partial<ChannelNotifyProps> = {
            channel_auto_follow_threads: followedStatus ? 'off' : 'on',
        };
        setAutoFollow(!autoFollow);
        updateChannelNotifyProps(serverUrl, channelId, props);
    });

    return (
        <OptionItem
            action={toggleFollow}
            label={formatMessage({id: 'channel_info.channel_auto_follow_threads', defaultMessage: 'Follow all threads in this channel'})}
            icon='message-plus-outline'
            type='toggle'
            selected={autoFollow}
            testID={`channel_info.options.channel_auto_follow_threads.option.toggled.${autoFollow}`}
        />
    );
};

export default AutoFollowThreads;
