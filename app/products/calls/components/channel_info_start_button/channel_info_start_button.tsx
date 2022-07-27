// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {leaveCall} from '@calls/actions';
import leaveAndJoinWithAlert from '@calls/components/leave_and_join_alert';
import {useTryCallsFunction} from '@calls/hooks';
import {useCallsState} from '@calls/state';
import {CurrentCall} from '@calls/types/calls';
import OptionBox from '@components/option_box';
import {useServerUrl} from '@context/server';
import {preventDoubleTap} from '@utils/tap';

import type ChannelModel from '@typings/database/models/servers/channel';

export interface Props {
    channel?: ChannelModel;
    currentCall: CurrentCall | null;
    currentCallChannelName: string;
    dismissChannelInfo?: () => void;
}

const ChannelInfoStartButton = ({channel, currentCall, currentCallChannelName, dismissChannelInfo}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const callsState = useCallsState(serverUrl);

    const callInCurrentChannel = Boolean(channel ? callsState.calls[channel.id] : false);
    const alreadyInCall = Boolean(currentCall && currentCall.channelId === channel?.id);
    const confirmToJoin = Boolean(currentCall && currentCall.channelId !== channel?.id);
    const toggleJoinLeave = () => {
        if (alreadyInCall) {
            leaveCall();
        } else {
            leaveAndJoinWithAlert(intl, serverUrl, channel?.id || '', currentCallChannelName, channel?.displayName || '', confirmToJoin, !callInCurrentChannel);
        }

        dismissChannelInfo?.();
    };
    const [tryJoin, msgPostfix] = useTryCallsFunction(toggleJoinLeave);

    const joinText = intl.formatMessage({id: 'mobile.calls_join_call', defaultMessage: 'Join Call'});
    const startText = intl.formatMessage({id: 'mobile.calls_start_call', defaultMessage: 'Start Call'});
    const leaveText = intl.formatMessage({id: 'mobile.calls_leave_call', defaultMessage: 'Leave Call'});

    return (
        <OptionBox
            onPress={preventDoubleTap(tryJoin)}
            text={(callInCurrentChannel ? joinText : startText) + msgPostfix}
            iconName='phone-in-talk'
            activeText={leaveText}
            activeIconName='phone-outline'
            isActive={alreadyInCall}
            testID='channel_info.options.join_start_call.option'
        />
    );
};

export default ChannelInfoStartButton;
