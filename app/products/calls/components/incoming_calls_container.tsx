// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import CallNotification from '@calls/components/call_notification';
import {useIncomingCalls} from '@calls/state';

const style = StyleSheet.create({
    wrapper: {
        width: '100%',
        gap: 8,
    },
});

type Props = {
    channelId: string;
}

export const IncomingCallsContainer = ({
    channelId,
}: Props) => {
    const incomingCalls = useIncomingCalls().incomingCalls;

    // const micPermissionsGranted = useGlobalCallsState().micPermissionsGranted;
    // const currentCall = useCurrentCall();

    // If we're in the channel for the incoming call, don't show the incoming call banner.
    const calls = incomingCalls.filter((ic) => ic.channelID !== channelId);
    if (calls.length === 0) {
        return null;
    }

    // const micPermissionsError = !micPermissionsGranted && (currentCall ? !currentCall.micPermissionsErrorDismissed : false);
    // const qualityAlert = (currentCall ? currentCall.callQualityAlert && currentCall.callQualityAlertDismissed === 0 : false);
    // const marginTop = (micPermissionsError ? CALL_ERROR_BAR_HEIGHT + 8 : 0) +
    //     (qualityAlert ? CALL_ERROR_BAR_HEIGHT + 8 : 0);
    // const wrapperTop = {marginTop};

    return (
        <View style={style.wrapper}>
            {calls.map((ic) => (
                <CallNotification
                    key={ic.callID}
                    incomingCall={ic}
                />
            ))}
        </View>
    );
};
