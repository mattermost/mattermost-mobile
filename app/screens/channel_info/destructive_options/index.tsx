// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import LeaveChannelLabel from '@components/channel_actions/leave_channel_label';
import PermanentDelete from '@screens/channel_settings/permanent_delete';

type Props = {
    canPermanentlyDelete: boolean;
    channelDisplayName: string;
    channelId: string;
    type?: ChannelType;
}

const DestructiveOptions = ({canPermanentlyDelete, channelDisplayName, channelId, type}: Props) => {
    return (
        <>
            <PermanentDelete
                canDelete={canPermanentlyDelete}
                channelId={channelId}
                displayName={channelDisplayName}
                type={type}
            />
            <LeaveChannelLabel
                channelId={channelId}
                isOptionItem={true}
                testID='channel_info.options.leave_channel.option'
            />
        </>
    );
};

export default DestructiveOptions;
