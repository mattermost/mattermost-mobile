// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {injectIntl, IntlShape} from 'react-intl';

import {Theme} from '@mm-redux/types/theme';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {useTryCallsFunction} from '@mmproducts/calls/hooks';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    actions: {
        joinCall: (channelId: string) => any;
    };
    testID?: string;
    theme: Theme;
    currentChannelId: string;
    currentChannelName: string;
    callChannelName: string;
    confirmToJoin: boolean;
    alreadyInTheCall: boolean;
    canStartCall: boolean;
    ongoingCall: boolean;
    intl: typeof IntlShape;
}

const StartCall = (props: Props) => {
    const {testID, canStartCall, theme, actions, currentChannelId, callChannelName, currentChannelName, confirmToJoin, alreadyInTheCall, ongoingCall, intl} = props;

    const leaveAndJoin = useCallback(() => {
        leaveAndJoinWithAlert(intl, currentChannelId, callChannelName, currentChannelName, confirmToJoin, actions.joinCall);
    }, [intl, currentChannelId, callChannelName, currentChannelName, confirmToJoin, actions.joinCall]);
    const [tryLeaveAndJoin, msgPostfix] = useTryCallsFunction(leaveAndJoin);
    const handleStartCall = useCallback(preventDoubleTap(tryLeaveAndJoin), [tryLeaveAndJoin]);

    if (!canStartCall) {
        return null;
    }

    if (alreadyInTheCall) {
        return null;
    }

    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                testID={testID}
                action={handleStartCall}
                defaultMessage={(ongoingCall ? 'Join Ongoing Call' : 'Start Call') + msgPostfix}
                icon='phone-in-talk'
                theme={theme}
                rightArrow={false}
            />
        </>
    );
};

export default injectIntl(StartCall);
