// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useSelector} from 'react-redux';

import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {Theme} from '@mm-redux/types/theme';
import EnableDisableCalls from '@mmproducts/calls/components/channel_info/enable_disable_calls';
import StartCall from '@mmproducts/calls/components/channel_info/start_call';
import {useCallsChannelSettings} from '@mmproducts/calls/hooks';
import {disableChannelCalls, enableChannelCalls} from '@mmproducts/calls/store/actions/calls';

type Props = {
    theme: Theme;
    startCall: (channelId: string) => void;
}

const CallsChannelInfo = ({theme, startCall}: Props) => {
    const currentChannel = useSelector(getCurrentChannel);
    const [enabled, canEnableDisable] = useCallsChannelSettings();

    const toggleCalls = () => {
        if (enabled) {
            disableChannelCalls(currentChannel.id);
        } else {
            enableChannelCalls(currentChannel.id);
        }
    };

    return (
        <>
            {enabled &&
                <StartCall
                    testID='channel_info.start_call.action'
                    theme={theme}
                    currentChannelId={currentChannel.id}
                    currentChannelName={currentChannel.display_name}
                    joinCall={startCall}
                />
            }
            {canEnableDisable &&
                <EnableDisableCalls
                    testID='channel_info.start_call.action'
                    theme={theme}
                    onPress={toggleCalls}
                    enabled={enabled}
                />
            }
        </>
    );
};

export default CallsChannelInfo;
