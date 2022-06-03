// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {injectIntl, intlShape, IntlShape} from 'react-intl';
import {useSelector} from 'react-redux';

import {getChannel, getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {GlobalState} from '@mm-redux/types/store';
import {Theme} from '@mm-redux/types/theme';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {useTryCallsFunction} from '@mmproducts/calls/hooks';
import {getCalls, getCurrentCall, isLimitRestricted} from '@mmproducts/calls/store/selectors/calls';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID: string;
    theme: Theme;
    intl: typeof IntlShape;
    joinCall: (channelId: string, intl: typeof intlShape) => void;
}

const StartCall = ({testID, theme, intl, joinCall}: Props) => {
    const currentChannel = useSelector(getCurrentChannel);
    const call = useSelector(getCalls)[currentChannel.id];
    const currentCall = useSelector(getCurrentCall);
    const currentCallChannelId = currentCall?.channelId || '';
    const callChannelName = useSelector((state: GlobalState) => getChannel(state, currentCallChannelId)?.display_name) || '';
    const limitRestricted = useSelector(isLimitRestricted);

    const confirmToJoin = Boolean(currentCall && currentCall.channelId !== currentChannel.id);
    const alreadyInTheCall = Boolean(currentCall && call && currentCall.channelId === call.channelId);
    const ongoingCall = Boolean(call);

    const leaveAndJoin = useCallback(() => {
        leaveAndJoinWithAlert(intl, currentChannel.id, callChannelName, currentChannel.display_name, confirmToJoin, joinCall);
    }, [intl, currentChannel.id, callChannelName, currentChannel.display_name, confirmToJoin, joinCall]);
    const [tryLeaveAndJoin, msgPostfix] = useTryCallsFunction(leaveAndJoin);
    const handleStartCall = useCallback(preventDoubleTap(tryLeaveAndJoin), [tryLeaveAndJoin]);

    if (alreadyInTheCall || limitRestricted) {
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
