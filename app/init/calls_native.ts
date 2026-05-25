// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative, {
    type CallActionPayload,
    type CallMutePayload,
    type IncomingCallPayload,
    type VoIPTokenUpdated,
} from '@mattermost/calls-native';
import {defineMessages} from 'react-intl';
import {Platform, type EmitterSubscription} from 'react-native';

defineMessages({
    incomingCallPlaceholder: {
        id: 'mobile.ios.calls.incoming_call_placeholder',
        defaultMessage: '{applicationName} call',
    },
});

import {storeVoIPDeviceToken} from '@actions/app/global';
import {switchToChannelById} from '@actions/remote/channel';
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
import {getServerByIdentifier} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {getIntlShape, isBetaApp} from '@utils/general';
import {logDebug, logError, logInfo} from '@utils/log';

class CallsNativeSingleton {
    subscriptions?: EmitterSubscription[];

    init() {
        if (Platform.OS !== 'ios') {
            // The Android side of @mattermost/calls-native is a no-op
            // stub for Phase 1.
            return;
        }

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

        // apple_voip_rn / apple_voip_rnbeta — same beta detection as the
        // standard push token in push_notifications.ts.
        let prefix = Device.PUSH_NOTIFY_APPLE_VOIP_REACT_NATIVE;
        if (isBetaApp) {
            prefix = `${prefix}beta`;
        }
        const prefixed = `${prefix}:${token}`;
        await storeVoIPDeviceToken(prefixed);
        logInfo('VoIP device token stored');
    };

    private onIncomingCall = async (payload: IncomingCallPayload) => {
        const {uuid, serverId, channelId, postId, threadId} = payload;

        if (!serverId || !channelId) {
            logDebug('onIncomingCall received without serverId/channelId; ignoring', payload);
            return;
        }

        const server = await getServerByIdentifier(serverId);
        if (!server?.url) {
            logDebug('onIncomingCall could not resolve serverId to a known server', serverId);

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
    };

    private onCallAnswered = async (event: CallActionPayload) => {
        const {uuid} = event;
        const mapping = getNativeCallMapping(uuid);
        if (!mapping) {
            // No mapping means we can't route the answer anywhere; tell
            // Native to close the UI so the user isn't stuck in
            // "Connecting…" forever.
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

            const activeServerUrl = await DatabaseManager.getActiveServerUrl();
            if (activeServerUrl !== serverUrl) {
                await DatabaseManager.setActiveServerDatabase(serverUrl);
            }
            await switchToChannelById(serverUrl, channelId);
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
