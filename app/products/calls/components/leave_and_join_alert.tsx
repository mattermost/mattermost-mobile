// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert} from 'react-native';

export default function leaveAndJoinWithAlert(
    intl: IntlShape,
    serverUrl: string,
    channelId: string,
    leaveChannelName: string,
    joinChannelName: string,
    confirmToJoin: boolean,
    joinCall: (serverUrl: string, channelId: string, intl: IntlShape) => void,
) {
    if (confirmToJoin) {
        const {formatMessage} = intl;
        Alert.alert(
            formatMessage({
                id: 'mobile.leave_and_join_title',
                defaultMessage: 'Are you sure you want to switch to a different call?',
            }),
            formatMessage({
                id: 'mobile.leave_and_join_message',
                defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and join the call in ~{joinChannelName}?',
            }, {leaveChannelName, joinChannelName}),
            [
                {
                    text: formatMessage({
                        id: 'mobile.post.cancel',
                        defaultMessage: 'Cancel',
                    }),
                },
                {
                    text: formatMessage({
                        id: 'mobile.leave_and_join_confirmation',
                        defaultMessage: 'Leave & Join',
                    }),
                    onPress: () => joinCall(serverUrl, channelId, intl),
                    style: 'cancel',
                },
            ],
        );
    } else {
        joinCall(serverUrl, channelId, intl);
    }
}
