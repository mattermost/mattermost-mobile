// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert} from 'react-native';

export default function leaveAndJoinWithAlert(intl: typeof IntlShape, channelId: string, callChannelName: string, currentChannelName: string, confirmToJoin: boolean, joinCall: (channelId: string, intl: typeof IntlShape) => void) {
    if (confirmToJoin) {
        Alert.alert(
            'Are you sure you want to switch to a different call?',
            `You are already on a channel call in ~${callChannelName}. Do you want to leave your current call and join the call in ~${currentChannelName}?`,
            [
                {
                    text: 'Cancel',
                },
                {
                    text: 'Leave & Join',
                    onPress: () => joinCall(channelId, intl),
                    style: 'cancel',
                },
            ],
        );
    } else {
        joinCall(channelId, intl);
    }
}
