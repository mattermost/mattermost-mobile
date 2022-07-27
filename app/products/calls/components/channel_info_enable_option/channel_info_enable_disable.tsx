// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import EnableDisableCallsOption from '@calls/components/channel_info_enable_option/enable_disable_calls_option';
import {useCallsConfig} from '@calls/state';
import {General} from '@constants';
import {useServerUrl} from '@context/server';

import type ChannelModel from '@typings/database/models/servers/channel';

export interface Props {
    channel?: ChannelModel;
    channelAdmin: boolean;
    systemAdmin: boolean;
    separatorStyle: {};
}

const ChannelInfoEnableDisable = ({channel, channelAdmin, systemAdmin, separatorStyle}: Props) => {
    const serverUrl = useServerUrl();
    const callsConfig = useCallsConfig(serverUrl);
    if (!channel) {
        return null;
    }

    const isDirectMessage = channel.type === General.DM_CHANNEL;
    const isGroupMessage = channel.type === General.GM_CHANNEL;

    const isAdmin = channelAdmin || systemAdmin;
    let canEnableDisable = systemAdmin;
    if (callsConfig.AllowEnableCalls) {
        canEnableDisable = isDirectMessage || isGroupMessage || isAdmin;
    }

    if (!canEnableDisable) {
        return null;
    }

    return (
        <>
            <EnableDisableCallsOption channelId={channel.id}/>
            <View style={separatorStyle}/>
        </>
    );
};

export default ChannelInfoEnableDisable;
