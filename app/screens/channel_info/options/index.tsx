// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {General} from '@constants';

import EditChannel from './edit_channel';
import IgnoreMentions from './ignore_mentions';
import Members from './members';
import NotificationPreference from './notification_preference';
import PinnedMessages from './pinned_messages';

type Props = {
    channelId: string;
    type?: ChannelType;
}

const Options = ({channelId, type}: Props) => {
    return (
        <>
            {type !== General.DM_CHANNEL &&
            <IgnoreMentions channelId={channelId}/>
            }
            <NotificationPreference channelId={channelId}/>
            <PinnedMessages channelId={channelId}/>
            {type !== General.DM_CHANNEL &&
            <Members channelId={channelId}/>
            }
            {type !== General.DM_CHANNEL && type !== General.GM_CHANNEL &&
            <EditChannel channelId={channelId}/>
            }
        </>
    );
};

export default Options;
