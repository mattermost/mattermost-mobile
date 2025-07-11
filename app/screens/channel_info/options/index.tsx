// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CopyChannelLinkOption from '@components/channel_actions/copy_channel_link_option';
import {General} from '@constants';
import PlaybookRunsOption from '@playbooks/components/channel_actions/playbook_runs_option';
import {isTypeDMorGM} from '@utils/channel';

import AddMembers from './add_members';
import AutoFollowThreads from './auto_follow_threads';
import ChannelFiles from './channel_files';
import EditChannel from './edit_channel';
import IgnoreMentions from './ignore_mentions';
import Members from './members';
import NotificationPreference from './notification_preference';
import PinnedMessages from './pinned_messages';

type Props = {
    channelId: string;
    type?: ChannelType;
    callsEnabled: boolean;
    canManageMembers: boolean;
    isCRTEnabled: boolean;
    canManageSettings: boolean;
}

const Options = ({
    channelId,
    type,
    callsEnabled,
    canManageMembers,
    isCRTEnabled,
    canManageSettings,
}: Props) => {
    const isDMorGM = isTypeDMorGM(type);

    return (
        <>
            {type !== General.DM_CHANNEL && (
                <>
                    {isCRTEnabled && (
                        <AutoFollowThreads channelId={channelId}/>
                    )}
                    <IgnoreMentions channelId={channelId}/>
                </>
            )}
            <NotificationPreference channelId={channelId}/>
            <PinnedMessages channelId={channelId}/>
            <ChannelFiles channelId={channelId}/>
            <PlaybookRunsOption channelId={channelId}/>
            {type !== General.DM_CHANNEL &&
                <Members channelId={channelId}/>
            }
            {canManageMembers &&
                <AddMembers channelId={channelId}/>
            }
            {callsEnabled && !isDMorGM && // if calls is not enabled, copy link will show in the channel actions
                <CopyChannelLinkOption
                    channelId={channelId}
                    testID='channel_info.options.copy_channel_link.option'
                />
            }
            {canManageSettings &&
                <EditChannel channelId={channelId}/>
            }
        </>
    );
};

export default Options;
