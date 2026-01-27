// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';

type Props = {
    channelId: string;
}

const DestructiveOptions = ({channelId}: Props) => {
    return (
        <>
            <LeaveChannelLabel
                channelId={channelId}
                isOptionItem={true}
                testID='channel_info.options.leave_channel.option'
            />
        </>
    );
};

export default DestructiveOptions;
