// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {useSelector} from 'react-redux';

import {getChannel} from '@mm-redux/selectors/entities/channels';
import {GlobalState} from '@mm-redux/types/store';
import {Theme} from '@mm-redux/types/theme';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {useTryCallsFunction} from '@mmproducts/calls/hooks';
import {getCalls, getCurrentCall} from '@mmproducts/calls/store/selectors/calls';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID: string;
    theme: Theme;
    currentChannelId: string;
    currentChannelName: string;
    intl: typeof IntlShape;
    joinCall: (channelId: string) => void;
}

const StartCall = (props: Props) => {
    const {testID, theme, currentChannelId, currentChannelName, intl, joinCall} = props;

    const call = useSelector(getCalls)[currentChannelId];
    const currentCall = useSelector(getCurrentCall);
    const currentCallChannelId = currentCall?.channelId || '';
    const callChannelName = useSelector((state: GlobalState) => getChannel(state, currentCallChannelId)?.display_name) || '';

    const confirmToJoin = Boolean(currentCall && currentCall.channelId !== currentChannelId);
    const alreadyInTheCall = Boolean(currentCall && call && currentCall.channelId === call.channelId);
    const ongoingCall = Boolean(call);

    const leaveAndJoin = useCallback(() => {
        leaveAndJoinWithAlert(intl, currentChannelId, callChannelName, currentChannelName, confirmToJoin, joinCall);
    }, [intl, currentChannelId, callChannelName, currentChannelName, confirmToJoin, joinCall]);
    const [tryLeaveAndJoin, msgPostfix] = useTryCallsFunction(leaveAndJoin);
    const handleStartCall = useCallback(preventDoubleTap(tryLeaveAndJoin), [tryLeaveAndJoin]);

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
