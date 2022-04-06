// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape} from 'react-intl';

import {Theme} from '@mm-redux/types/theme';
import EnableDisableCalls from '@mmproducts/calls/components/channel_info/enable_disable_calls';
import StartCall from '@mmproducts/calls/components/channel_info/start_call';
import {useCallsChannelSettings} from '@mmproducts/calls/hooks';

type Props = {
    theme: Theme;
    joinCall: (channelId: string, intl: typeof intlShape) => void;
}

const CallsChannelInfo = ({theme, joinCall}: Props) => {
    const [enabled, canEnableDisable] = useCallsChannelSettings();

    return (
        <>
            {enabled &&
                <StartCall
                    testID='channel_info.start_call.action'
                    theme={theme}
                    joinCall={joinCall}
                />
            }
            {canEnableDisable &&
                <EnableDisableCalls
                    testID='channel_info.start_call.action'
                    theme={theme}
                    enabled={enabled}
                />
            }
        </>
    );
};

export default CallsChannelInfo;
