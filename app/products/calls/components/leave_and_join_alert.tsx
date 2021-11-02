// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert} from 'react-native';

export default function leaveAndJoinWithAlert(intl: typeof IntlShape, channelId: string, callChannelName: string, currentChannelName: string, confirmToJoin: boolean, joinCall: (channelId: string) => void) {
    if (confirmToJoin) {
        Alert.alert(
            intl.formatMessage({id: 'calls.confirm-to-join-title', defaultMessage: 'Are you sure you want to switch to a different call?'}),
            intl.formatMessage({
                id: 'calls.confirm-to-join-description',
                defaultMessage: 'You are already on a channel call in ~{callChannelName}. Do you want to leave your current call and join the call in ~{currentChannelName}?',
            }, {callChannelName, currentChannelName}),
            [
                {
                    text: intl.formatMessage({id: 'calls.confirm-to-join-cancel', defaultMessage: 'Cancel'}),
                },
                {
                    text: intl.formatMessage({id: 'calls.confirm-to-join-leave-and-join', defaultMessage: 'Leave & Join'}),
                    onPress: () => joinCall(channelId),
                    style: 'cancel',
                },
            ],
        );
    } else {
        joinCall(channelId);
    }
}
