// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {hasMicrophonePermission, joinCall} from '@calls/actions';
import {errorAlert} from '@calls/utils';

import type {IntlShape} from 'react-intl';

export default function leaveAndJoinWithAlert(
    intl: IntlShape,
    serverUrl: string,
    channelId: string,
    leaveChannelName: string,
    joinChannelName: string,
    confirmToJoin: boolean,
    newCall: boolean,
) {
    if (confirmToJoin) {
        const {formatMessage} = intl;

        let joinMessage = formatMessage({
            id: 'mobile.leave_and_join_message',
            defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and join the call in ~{joinChannelName}?',
        }, {leaveChannelName, joinChannelName});
        if (newCall) {
            joinMessage = formatMessage({
                id: 'mobile.leave_and_join_message',
                defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and start a new call in ~{joinChannelName}?',
            }, {leaveChannelName, joinChannelName});
        }

        Alert.alert(
            formatMessage({
                id: 'mobile.leave_and_join_title',
                defaultMessage: 'Are you sure you want to switch to a different call?',
            }),
            joinMessage,
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
                    onPress: () => doJoinCall(serverUrl, channelId, intl),
                    style: 'cancel',
                },
            ],
        );
    } else {
        doJoinCall(serverUrl, channelId, intl);
    }
}

export const doJoinCall = async (serverUrl: string, channelId: string, intl: IntlShape) => {
    const {formatMessage} = intl;

    const hasPermission = await hasMicrophonePermission(intl);
    if (!hasPermission) {
        errorAlert(formatMessage({
            id: 'mobile.calls_error_permissions',
            defaultMessage: 'No permissions to microphone, unable to start call',
        }), intl);
        return;
    }

    const res = await joinCall(serverUrl, channelId);
    if (res.error) {
        const seeLogs = formatMessage({id: 'mobile.calls_see_logs', defaultMessage: 'See server logs'});
        errorAlert(res.error?.toString() || seeLogs, intl);
    }
};
