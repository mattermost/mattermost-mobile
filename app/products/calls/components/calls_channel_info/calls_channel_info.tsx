// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {View} from 'react-native';

import {loadConfig} from '@calls/actions';
import EnableDisableCallsOption from '@calls/components/calls_channel_info/enable_disable_calls_option';
import StartCallOption from '@calls/components/calls_channel_info/start_call_option';
import {CallsConfig, CurrentCall} from '@calls/types/calls';
import {General} from '@constants';

import type ChannelModel from '@typings/database/models/servers/channel';

export interface Props {
    serverUrl: string;
    channel?: ChannelModel;
    channelAdmin: boolean;
    systemAdmin: boolean;
    callsConfig: CallsConfig;
    explicitlyEnabled: boolean;
    explicitlyDisabled: boolean;
    currentCall: CurrentCall | null;
    currentCallChannelName: string;
    dismissChannelInfo: () => void;
    separatorStyle: {};
}

const CallsChannelInfo = ({
    serverUrl,
    channel,
    channelAdmin,
    systemAdmin,
    callsConfig,
    explicitlyEnabled,
    explicitlyDisabled,
    currentCall,
    currentCallChannelName,
    dismissChannelInfo,
    separatorStyle,
}: Props) => {
    useEffect(() => {
        if (callsConfig.pluginEnabled) {
            loadConfig(serverUrl);
        }
    }, []);

    if (!channel) {
        return null;
    }

    const isDirectMessage = channel.type === General.DM_CHANNEL;
    const isGroupMessage = channel.type === General.GM_CHANNEL;

    const enabled = explicitlyEnabled || (!explicitlyDisabled && callsConfig.DefaultEnabled);
    const isAdmin = channelAdmin || systemAdmin;
    let canEnableDisable = systemAdmin;
    if (callsConfig.AllowEnableCalls) {
        canEnableDisable = isDirectMessage || isGroupMessage || isAdmin;
    }

    return (
        <>
            {enabled &&
                <StartCallOption
                    currentChannel={channel}
                    currentCall={currentCall}
                    currentCallChannelName={currentCallChannelName}
                    dismissChannelInfo={dismissChannelInfo}
                />
            }
            {canEnableDisable &&
                <EnableDisableCallsOption
                    channelId={channel.id}
                    enabled={enabled}
                />
            }
            {(enabled || canEnableDisable) &&
                <View style={separatorStyle}/>
            }
        </>
    );
};

export default CallsChannelInfo;
