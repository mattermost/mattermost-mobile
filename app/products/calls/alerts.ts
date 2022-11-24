// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {hasMicrophonePermission, joinCall, leaveCall, unmuteMyself} from '@calls/actions';
import {setMicPermissionsGranted, setRecAcknowledged} from '@calls/state';
import {errorAlert} from '@calls/utils';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModals, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {logError} from '@utils/log';

import type {IntlShape} from 'react-intl';

// Only allow one recording alert per call.
let recordingAlertLock = false;

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

    let user;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        user = await getCurrentUser(database);
        if (!user) {
            // This shouldn't happen, so don't bother localizing and displaying an alert.
            return;
        }
    } catch (error) {
        logError('failed to getServerDatabaseAndOperator in doJoinCall', error);
        return;
    }

    recordingAlertLock = false;
    const hasPermission = await hasMicrophonePermission();
    setMicPermissionsGranted(hasPermission);

    const res = await joinCall(serverUrl, channelId, user.id, hasPermission);
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

export const recordingAlert = (intl: IntlShape) => {
    if (recordingAlertLock) {
        return;
    }
    recordingAlertLock = true;

    const {formatMessage} = intl;

    const participantMessage = formatMessage({
        id: 'mobile.calls_participant_rec',
        defaultMessage: 'The host has started recording this meeting. By staying in the meeting you give consent to being recorded.',
    });

    Alert.alert(
        formatMessage({
            id: 'mobile.calls_participant_rec_title',
            defaultMessage: 'Recording is in progress',
        }),
        participantMessage,
        [
            {
                text: formatMessage({
                    id: 'mobile.calls_leave',
                    defaultMessage: 'Leave',
                }),
                onPress: async () => {
                    leaveCall();

                    // Need to pop the call screen, if it's somewhere in the stack.
                    await dismissAllModals();
                    if (NavigationStore.getNavigationComponents().includes(Screens.CALL)) {
                        await dismissAllModalsAndPopToScreen(Screens.CALL, 'Call');
                        Navigation.pop(Screens.CALL).catch(() => null);
                    }
                },
                style: 'cancel',
            },
            {
                text: formatMessage({
                    id: 'mobile.calls_okay',
                    defaultMessage: 'Okay',
                }),
                onPress: () => setRecAcknowledged(),
            },
        ],
    );
};
