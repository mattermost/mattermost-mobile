// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {updateChannelNotifyProps} from '@actions/remote/channel';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';
import {alertErrorWithFallback} from '@utils/draft';

type Props = {
    channelId: string;
    ignoring: boolean;
    displayName: string;
}

const IgnoreMentions = ({channelId, ignoring, displayName}: Props) => {
    const [ignored, setIgnored] = useState(ignoring);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const toggleIgnore = usePreventDoubleTap(useCallback(async () => {
        const props: Partial<ChannelNotifyProps> = {
            ignore_channel_mentions: ignoring ? 'off' : 'on',
        };
        setIgnored((v) => !v);
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
            setIgnored((v) => !v);
        }
    }, [channelId, displayName, ignoring, intl, serverUrl]));

    return (
        <OptionItem
            action={toggleIgnore}
            label={intl.formatMessage({id: 'channel_info.ignore_mentions', defaultMessage: 'Ignore @channel, @here, @all'})}
            icon='at'
            type='toggle'
            selected={ignored}
            testID={`channel_info.options.ignore_mentions.option.toggled.${ignored}`}
        />
    );
};

export default IgnoreMentions;
