// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import {updateChannelNotifyProps} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    ignoring: boolean;
}

const IgnoreMentions = ({channelId, ignoring}: Props) => {
    const [ignored, setIgnored] = useState(ignoring);
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();

    const toggleIgnore = preventDoubleTap(() => {
        const props: Partial<ChannelNotifyProps> = {
            ignore_channel_mentions: ignoring ? 'off' : 'on',
        };
        setIgnored(!ignored);
        updateChannelNotifyProps(serverUrl, channelId, props);
    });

    return (
        <OptionItem
            action={toggleIgnore}
            label={formatMessage({id: 'channel_info.ignore_mentions', defaultMessage: 'Ignore @channel, @here, @all'})}
            icon='at'
            type='toggle'
            selected={ignored}
        />
    );
};

export default IgnoreMentions;
