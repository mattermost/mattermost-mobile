// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import {General} from '@constants';

import Archive from './archive';
import ConvertPrivate from './convert_private';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    componentId: AvailableScreens;
    type?: ChannelType;
}

const DestructiveOptions = ({channelId, componentId, type}: Props) => {
    return (
        <>
            {type === General.OPEN_CHANNEL &&
            <ConvertPrivate channelId={channelId}/>
            }
            <LeaveChannelLabel
                channelId={channelId}
                isOptionItem={true}
                testID='channel_info.options.leave_channel.option'
            />
            {type !== General.DM_CHANNEL && type !== General.GM_CHANNEL &&
            <Archive
                channelId={channelId}
                componentId={componentId}
                type={type}
            />
            }
        </>
    );
};

export default DestructiveOptions;
