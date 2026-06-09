// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative, {
    type CallActionPayload,
    type CallMutePayload,
    type IncomingCallPayload,
    type VoIPTokenUpdated,
} from '@mattermost/calls-native';
import {defineMessages} from 'react-intl';
import {type EmitterSubscription} from 'react-native';

defineMessages({
    incomingCallPlaceholder: {
        id: 'mobile.ios.calls.incoming_call_placeholder',
        defaultMessage: '{applicationName} call',
    },
    androidCallsAnswer: {
        id: 'mobile.android.calls.answer',
        defaultMessage: 'Answer',
    },
    androidCallsCallFailed: {
        id: 'mobile.android.calls.call_failed',
        defaultMessage: 'Call failed',
    },
    androidCallsConnected: {
        id: 'mobile.android.calls.connected',
        defaultMessage: 'Connected',
    },
    androidCallsConnecting: {
        id: 'mobile.android.calls.connecting',
        defaultMessage: 'Connecting…',
    },
    androidCallsDecline: {
        id: 'mobile.android.calls.decline',
        defaultMessage: 'Decline',
    },
    androidCallsHangUp: {
        id: 'mobile.android.calls.hang_up',
        defaultMessage: 'Hang up',
    },
    androidCallsIncomingCallPlaceholder: {
        id: 'mobile.android.calls.incoming_call_placeholder',
        defaultMessage: '{applicationName} call',
    },
    androidCallsIncomingVoiceCall: {
        id: 'mobile.android.calls.incoming_voice_call',
        defaultMessage: 'Incoming voice call',
    },
    androidCallsMute: {
        id: 'mobile.android.calls.mute',
        defaultMessage: 'Mute',
    },
    androidCallsUnmute: {
        id: 'mobile.android.calls.unmute',
        defaultMessage: 'Unmute',
    },
    androidOngoingCall: {
        id: 'mobile.android.calls.ongoing',
        defaultMessage: 'Ongoing call',
    },
    androidOngoingCallMuted: {
        id: 'mobile.android.calls.ongoing.muted',
        defaultMessage: 'Ongoing call · Muted',
    },
});

import {storeVoIPDeviceToken} from '@actions/app/global';
import {dismissIncomingCall, hasMicrophonePermission, joinCall, leaveCall, muteMyself, unmuteMyself} from '@calls/actions';
import {hasBluetoothPermission} from '@calls/actions/permissions';
import {
    clearNativeCallMapping,
    getNativeCallMapping,
    setNativeCallMapping,
} from '@calls/native_call';
import {
    getCurrentCall,
    setMicPermissionsGranted,
} from '@calls/state';
import {Device} from '@constants';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServerByIdentifier} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {getIntlShape, isBetaApp} from '@utils/general';
import {logError, logInfo} from '@utils/log';

class CallsNativeSingleton {
    subscriptions?: EmitterSubscription[];

    init() {
        this.subscriptions?.forEach((s) => s.remove());
        this.subscriptions = [
            CallsNative.onVoIPTokenUpdated(this.onVoIPTokenUpdated),
            CallsNative.onIncomingCall(this.onIncomingCall),
            CallsNative.onCallAnswered(this.onCallAnswered),
            CallsNative.onCallDeclined(this.onCallDeclined),
            CallsNative.onCallEnded(this.onCallEnded),
            CallsNative.onMuteChanged(this.onMuteChanged),
        ];
    }

    cleanup() {
        this.subscriptions?.forEach((s) => s.remove());
        this.subscriptions = [];
    }

    private onVoIPTokenUpdated = async (event: VoIPTokenUpdated) => {
        const {token} = event;
        if (!token) {
            // Token invalidation: clear the stored value so the next
            // setExtraSessionProps call doesn't attach a stale token.
            await storeVoIPDeviceToken('');
            return;
        }

        let prefix = Device.PUSH_NOTIFY_APPLE_REACT_NATIVE;
        if (isBetaApp) {
            prefix = `${prefix}beta`;
        }
        const prefixed = `${prefix}-v2:${token}`;
        await storeVoIPDeviceToken(prefixed);
        logInfo('VoIP device token stored');
    };

    private onIncomingCall = async (payload: IncomingCallPayload) => {
        const {uuid, serverId, channelId, postId, threadId} = payload;

        if (!serverId || !channelId) {
            return;
        }

        const server = await getServerByIdentifier(serverId);
        if (!server?.url) {
            // Tell native to clear the Native UI so the user isn't stuck.
            CallsNative.reportEnded(uuid, 'failed');
            return;
        }

        setNativeCallMapping(uuid, {
            serverUrl: server.url,
            channelId,
            postId,
            threadId,
        });

        // Open WS to the call's server so call lifecycle events arrive live
        // while the native ring is showing. Fire-and-forget — idempotent if
        // already connected.
        WebsocketManager.initializeClient(server.url);
    };

    private onCallAnswered = async (event: CallActionPayload) => {
        const {uuid} = event;
        const mapping = getNativeCallMapping(uuid);
        if (!mapping) {
            // No mapping → can't route the answer anywhere; close the
            // native UI so the user isn't stuck on "Connecting…".
            CallsNative.reportEnded(uuid, 'failed');
            return;
        }

        const {serverUrl, channelId, threadId} = mapping;

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const user = await getCurrentUser(database);
            if (!user) {
                logError('onCallAnswered: no current user for server', serverUrl);
                CallsNative.reportEnded(uuid, 'failed');
                clearNativeCallMapping(uuid);
                return;
            }

            // If the user was in another call, leave it without prompting —
            // they already chose to answer via the Native overlay.
            const currentCall = getCurrentCall();
            if (currentCall && (currentCall.serverUrl !== serverUrl || currentCall.channelId !== channelId)) {
                leaveCall();
            }

            await hasBluetoothPermission();
            const hasMic = await hasMicrophonePermission();
            setMicPermissionsGranted(hasMic);

            const intl = getIntlShape(user.locale);
            const res = await joinCall(serverUrl, channelId, user.id, hasMic, intl, undefined, threadId);
            if (res.error) {
                logError('onCallAnswered: joinCall failed', res.error);
                CallsNative.reportEnded(uuid, 'failed');
                clearNativeCallMapping(uuid);
                return;
            }

            // Native is showing "Connecting…"; flip to "Connected" so the
            // timer starts. joinCall awaits waitForPeerConnection before
            // returning, so we know RTC is up at this point.
            CallsNative.reportConnected(uuid);

            // Mattermost calls always start muted regardless of mic
            // permission. Sync Native so its lock-screen mic icon matches
            // the JS-side mute state from the moment the call connects.
            CallsNative.setMuted(uuid, true);
        } catch (error) {
            logError('onCallAnswered failed', error);
            CallsNative.reportEnded(uuid, 'failed');
            clearNativeCallMapping(uuid);
        }
    };

    private onCallDeclined = async (event: CallActionPayload) => {
        const {uuid} = event;
        const mapping = getNativeCallMapping(uuid);
        clearNativeCallMapping(uuid);
        if (!mapping) {
            return;
        }
        await dismissIncomingCall(mapping.serverUrl, mapping.channelId);
    };

    private onCallEnded = (event: CallActionPayload) => {
        const {uuid} = event;
        const mapping = getNativeCallMapping(uuid);
        clearNativeCallMapping(uuid);
        if (!mapping) {
            return;
        }

        // If we're still in the call (the user ended via the Native
        // overlay rather than the in-app UI), tear down the RTC connection.
        const currentCall = getCurrentCall();
        if (currentCall && currentCall.serverUrl === mapping.serverUrl && currentCall.channelId === mapping.channelId) {
            leaveCall();
        }
    };

    private onMuteChanged = (event: CallMutePayload) => {
        const {uuid, muted} = event;
        const mapping = getNativeCallMapping(uuid);
        if (!mapping) {
            return;
        }
        const currentCall = getCurrentCall();
        if (!currentCall || currentCall.serverUrl !== mapping.serverUrl || currentCall.channelId !== mapping.channelId) {
            return;
        }
        if (muted) {
            muteMyself();
        } else {
            unmuteMyself();
        }
    };
}

const CallsNativeInit = new CallsNativeSingleton();
export default CallsNativeInit;
