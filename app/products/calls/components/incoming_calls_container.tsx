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
    channelId?: string;
}

export const IncomingCallsContainer = ({
    channelId,
}: Props) => {
    const incomingCalls = useIncomingCalls().incomingCalls;

    // If we're in the channel for the incoming call, don't show the incoming call banner.
    const calls = incomingCalls.filter((ic) => ic.channelID !== channelId);
    if (calls.length === 0) {
        return null;
    }

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
