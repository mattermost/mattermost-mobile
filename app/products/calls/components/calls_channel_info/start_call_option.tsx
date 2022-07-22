// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import leaveAndJoinWithAlert from '@calls/components/leave_and_join_alert';
import {useTryCallsFunction} from '@calls/hooks';
import {useCallsState} from '@calls/state/calls_state';
import {CurrentCall} from '@calls/types/calls';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {preventDoubleTap} from '@utils/tap';

import type ChannelModel from '@typings/database/models/servers/channel';

interface Props {
    currentChannel?: ChannelModel;
    currentCall: CurrentCall | null;
    currentCallChannelName: string;
    dismissChannelInfo: () => void;
}

const StartCallOption = ({currentChannel, currentCall, currentCallChannelName, dismissChannelInfo}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const callsState = useCallsState(serverUrl);

    const callInCurrentChannel = currentChannel ? Boolean(callsState.calls[currentChannel.id]) : false;
    const confirmToJoin = Boolean(currentCall && currentCall.channelId !== currentChannel?.id);
    const leaveAndJoin = () => {
        if (!currentChannel) {
            return;
        }

        leaveAndJoinWithAlert(intl, serverUrl, currentChannel.id, currentCallChannelName, currentChannel.displayName, confirmToJoin, !callInCurrentChannel);
        dismissChannelInfo();
    };
    const [tryJoin, msgPostfix] = useTryCallsFunction(leaveAndJoin);

    const joinText = intl.formatMessage({id: 'mobile.calls_join_call', defaultMessage: 'Join Ongoing Call'});
    const startText = intl.formatMessage({id: 'mobile.calls_start_call', defaultMessage: 'Start Call'});

    return (
        <OptionItem
            action={preventDoubleTap(tryJoin)}
            label={(callInCurrentChannel ? joinText : startText) + msgPostfix}
            icon='phone-in-talk'
            type='default'
            testID='channel_info.options.join_start_call.option'
        />
    );
};

export default StartCallOption;
