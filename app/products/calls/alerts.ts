// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {hasMicrophonePermission, joinCall, unmuteMyself} from '@calls/actions';
import {errorAlert} from '@calls/utils';

import type {IntlShape} from 'react-intl';

export const showLimitRestrictedAlert = (maxParticipants: number, intl: IntlShape) => {
    const title = intl.formatMessage({
        id: 'mobile.calls_participant_limit_title',
        defaultMessage: 'Participant limit reached',
    });
    const message = intl.formatMessage({
        id: 'mobile.calls_limit_msg',
        defaultMessage: 'The maximum number of participants per call is {maxParticipants}. Contact your System Admin to increase the limit.',
    }, {maxParticipants});
    const ok = intl.formatMessage({
        id: 'mobile.calls_ok',
        defaultMessage: 'Okay',
    });

    Alert.alert(
        title,
        message,
        [
            {
                text: ok,
                style: 'cancel',
            },
        ],
    );
};

export const leaveAndJoinWithAlert = (
    intl: IntlShape,
    serverUrl: string,
    channelId: string,
    leaveChannelName: string,
    joinChannelName: string,
    confirmToJoin: boolean,
    newCall: boolean,
    isDMorGM: boolean,
) => {
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
                    onPress: () => doJoinCall(serverUrl, channelId, isDMorGM, intl),
                    style: 'cancel',
                },
            ],
        );
    } else {
        doJoinCall(serverUrl, channelId, isDMorGM, intl);
    }
};

const doJoinCall = async (serverUrl: string, channelId: string, isDMorGM: boolean, intl: IntlShape) => {
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
        return;
    }

    if (isDMorGM) {
        // FIXME (MM-46048) - HACK
        // There's a race condition between unmuting and receiving existing tracks from other participants.
        // Fixing this properly requires extensive and potentially breaking changes.
        // Waiting for a second before unmuting is a decent workaround that should work in most cases.
        setTimeout(() => unmuteMyself(), 1000);
    }
};
