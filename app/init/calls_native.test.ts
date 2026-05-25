// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative, {
    type CallActionPayload,
    type CallMutePayload,
    type IncomingCallPayload,
    type VoIPTokenUpdated,
} from '@mattermost/calls-native';
import {Platform} from 'react-native';

import {storeVoIPDeviceToken} from '@actions/app/global';
import {switchToChannelById} from '@actions/remote/channel';
import {dismissIncomingCall, hasMicrophonePermission, joinCall, leaveCall, muteMyself, unmuteMyself} from '@calls/actions';
import {hasBluetoothPermission} from '@calls/actions/permissions';
import {
    clearNativeCallMapping,
    getNativeCallMapping,
    setNativeCallMapping,
} from '@calls/native_call';
import {getCurrentCall, setMicPermissionsGranted} from '@calls/state';
import {Device} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerByIdentifier} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';

jest.mock('@actions/app/global', () => ({
    storeVoIPDeviceToken: jest.fn(),
}));
jest.mock('@actions/remote/channel', () => ({
    switchToChannelById: jest.fn(),
}));
jest.mock('@calls/actions', () => ({
    dismissIncomingCall: jest.fn(),
    hasMicrophonePermission: jest.fn(),
    joinCall: jest.fn(),
    leaveCall: jest.fn(),
    muteMyself: jest.fn(),
    unmuteMyself: jest.fn(),
}));
jest.mock('@calls/actions/permissions', () => ({
    hasBluetoothPermission: jest.fn(),
}));
jest.mock('@calls/native_call', () => ({
    clearNativeCallMapping: jest.fn(),
    getNativeCallMapping: jest.fn(),
    setNativeCallMapping: jest.fn(),
}));
jest.mock('@calls/state', () => ({
    getCurrentCall: jest.fn(),
    setMicPermissionsGranted: jest.fn(),
}));
jest.mock('@queries/app/servers', () => ({
    getServerByIdentifier: jest.fn(),
}));
jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
}));
jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
    logInfo: jest.fn(),
}));

const SERVER_URL = 'https://example.com';

// Loads (or reloads) the singleton and returns the handlers the init()
// call registered, so we can drive each event handler directly.
const loadAndInit = () => {
    jest.isolateModules(() => {
        // Require inside isolateModules so resets don't leak across tests.
        const CallsNativeInit = require('./calls_native').default;
        CallsNativeInit.init();
    });
    const calls = (CallsNative as any);
    return {
        onVoIPTokenUpdated: calls.onVoIPTokenUpdated.mock.calls.at(-1)?.[0] as (e: VoIPTokenUpdated) => Promise<void>,
        onIncomingCall: calls.onIncomingCall.mock.calls.at(-1)?.[0] as (e: IncomingCallPayload) => Promise<void>,
        onCallAnswered: calls.onCallAnswered.mock.calls.at(-1)?.[0] as (e: CallActionPayload) => Promise<void>,
        onCallDeclined: calls.onCallDeclined.mock.calls.at(-1)?.[0] as (e: CallActionPayload) => Promise<void>,
        onCallEnded: calls.onCallEnded.mock.calls.at(-1)?.[0] as (e: CallActionPayload) => void,
        onMuteChanged: calls.onMuteChanged.mock.calls.at(-1)?.[0] as (e: CallMutePayload) => void,
    };
};

let originalOS: typeof Platform.OS;

beforeEach(() => {
    jest.clearAllMocks();
    originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {get: () => 'ios'});
});

afterEach(() => {
    Object.defineProperty(Platform, 'OS', {get: () => originalOS});
});

describe('init/cleanup', () => {
    it('subscribes to all six events on iOS', () => {
        loadAndInit();
        expect(CallsNative.onVoIPTokenUpdated).toHaveBeenCalledTimes(1);
        expect(CallsNative.onIncomingCall).toHaveBeenCalledTimes(1);
        expect(CallsNative.onCallAnswered).toHaveBeenCalledTimes(1);
        expect(CallsNative.onCallDeclined).toHaveBeenCalledTimes(1);
        expect(CallsNative.onCallEnded).toHaveBeenCalledTimes(1);
        expect(CallsNative.onMuteChanged).toHaveBeenCalledTimes(1);
    });

    it('is a no-op on Android', () => {
        Object.defineProperty(Platform, 'OS', {get: () => 'android'});
        loadAndInit();
        expect(CallsNative.onVoIPTokenUpdated).not.toHaveBeenCalled();
        expect(CallsNative.onIncomingCall).not.toHaveBeenCalled();
    });
});

describe('onVoIPTokenUpdated', () => {
    it('stores empty string when token is empty (invalidation)', async () => {
        const {onVoIPTokenUpdated} = loadAndInit();
        await onVoIPTokenUpdated({token: ''});
        expect(storeVoIPDeviceToken).toHaveBeenCalledWith('');
    });

    // The shared expo-application mock in test/setup.ts sets applicationId
    // to 'com.mattermost.rnbeta', so isBetaApp is true by default in tests.
    it('stores beta-prefixed token under the default (beta) test config', async () => {
        const {onVoIPTokenUpdated} = loadAndInit();
        await onVoIPTokenUpdated({token: 'abc123'});
        expect(storeVoIPDeviceToken).toHaveBeenCalledWith(`${Device.PUSH_NOTIFY_APPLE_VOIP_REACT_NATIVE}beta:abc123`);
    });

    it('stores non-beta-prefixed token when isBetaApp is false', async () => {
        // Override isBetaApp to false for this test only.
        let handler: ((e: VoIPTokenUpdated) => Promise<void>) | undefined;
        jest.isolateModules(() => {
            jest.doMock('@utils/general', () => {
                const actual = jest.requireActual('@utils/general');
                return {
                    ...actual,
                    isBetaApp: false,
                };
            });
            const CallsNativeInit = require('./calls_native').default;
            CallsNativeInit.init();
            const mockedOnUpdated = CallsNative.onVoIPTokenUpdated as jest.Mock;
            const lastCall = mockedOnUpdated.mock.calls[mockedOnUpdated.mock.calls.length - 1];
            handler = lastCall?.[0];
        });
        await handler!({token: 'abc123'});
        expect(storeVoIPDeviceToken).toHaveBeenCalledWith(`${Device.PUSH_NOTIFY_APPLE_VOIP_REACT_NATIVE}:abc123`);
    });
});

describe('onIncomingCall', () => {
    it('ignores payload missing serverId', async () => {
        const {onIncomingCall} = loadAndInit();
        await onIncomingCall({uuid: 'u1', serverId: '', channelId: 'ch1', postId: 'p1', threadId: 't1'} as IncomingCallPayload);
        expect(setNativeCallMapping).not.toHaveBeenCalled();
        expect(CallsNative.reportEnded).not.toHaveBeenCalled();
    });

    it('ignores payload missing channelId', async () => {
        const {onIncomingCall} = loadAndInit();
        await onIncomingCall({uuid: 'u1', serverId: 's1', channelId: '', postId: '', threadId: ''} as IncomingCallPayload);
        expect(setNativeCallMapping).not.toHaveBeenCalled();
        expect(CallsNative.reportEnded).not.toHaveBeenCalled();
    });

    it('reports ended when the serverId cannot be resolved', async () => {
        (getServerByIdentifier as jest.Mock).mockResolvedValueOnce(null);
        const {onIncomingCall} = loadAndInit();
        await onIncomingCall({
            uuid: 'u1',
            serverId: 'unknown',
            channelId: 'ch1',
            postId: '',
            threadId: '',
            callerId: '',
            callerName: '',
        });
        expect(CallsNative.reportEnded).toHaveBeenCalledWith('u1', 'failed');
        expect(setNativeCallMapping).not.toHaveBeenCalled();
    });

    it('stores the mapping for a valid payload', async () => {
        (getServerByIdentifier as jest.Mock).mockResolvedValueOnce({url: SERVER_URL});
        const {onIncomingCall} = loadAndInit();

        await onIncomingCall({
            uuid: 'u1',
            serverId: 's1',
            channelId: 'ch1',
            postId: 'p1',
            threadId: 't1',
            callerId: '',
            callerName: '',
        });
        expect(setNativeCallMapping).toHaveBeenCalledWith('u1', {
            serverUrl: SERVER_URL,
            channelId: 'ch1',
            postId: 'p1',
            threadId: 't1',
        });
        expect(CallsNative.reportEnded).not.toHaveBeenCalled();
    });
});

describe('onCallAnswered', () => {
    const mapping = {serverUrl: SERVER_URL, channelId: 'ch1', postId: 'p1', threadId: 't1'};

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('reports ended when no mapping exists for the uuid', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(undefined);
        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});
        expect(CallsNative.reportEnded).toHaveBeenCalledWith('u1', 'failed');
        expect(joinCall).not.toHaveBeenCalled();
    });

    it('reports ended and clears mapping when there is no current user', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});
        expect(CallsNative.reportEnded).toHaveBeenCalledWith('u1', 'failed');
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
        expect(joinCall).not.toHaveBeenCalled();
    });

    it('leaves an active call on a different channel before joining', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'other-channel'});
        (hasMicrophonePermission as jest.Mock).mockResolvedValueOnce(true);
        (joinCall as jest.Mock).mockResolvedValueOnce({});

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(leaveCall).toHaveBeenCalledTimes(1);
        expect(joinCall).toHaveBeenCalled();
    });

    it('does not leave when the current call matches the answered call', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'ch1'});
        (hasMicrophonePermission as jest.Mock).mockResolvedValueOnce(true);
        (joinCall as jest.Mock).mockResolvedValueOnce({});

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(leaveCall).not.toHaveBeenCalled();
    });

    it('reports ended and clears mapping when joinCall returns an error', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce(null);
        (hasMicrophonePermission as jest.Mock).mockResolvedValueOnce(true);
        (joinCall as jest.Mock).mockResolvedValueOnce({error: 'boom'});

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(CallsNative.reportEnded).toHaveBeenCalledWith('u1', 'failed');
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
        expect(CallsNative.reportConnected).not.toHaveBeenCalled();
        expect(switchToChannelById).not.toHaveBeenCalled();
    });

    it('reports connected, mutes, and switches to the channel on successful join', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce(null);
        (hasMicrophonePermission as jest.Mock).mockResolvedValueOnce(true);
        (joinCall as jest.Mock).mockResolvedValueOnce({});
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValueOnce(SERVER_URL);

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(setMicPermissionsGranted).toHaveBeenCalledWith(true);
        expect(joinCall).toHaveBeenCalledWith(SERVER_URL, 'ch1', 'user1', true, expect.anything(), undefined, 't1');
        expect(CallsNative.reportConnected).toHaveBeenCalledWith('u1');
        expect(CallsNative.setMuted).toHaveBeenCalledWith('u1', true);
        expect(switchToChannelById).toHaveBeenCalledWith(SERVER_URL, 'ch1');
    });

    it('switches the active server when answering for a different server than the active one', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce(null);
        (hasMicrophonePermission as jest.Mock).mockResolvedValueOnce(true);
        (joinCall as jest.Mock).mockResolvedValueOnce({});
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValueOnce('https://other.example.com');
        const setActiveSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValueOnce(undefined as any);

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(setActiveSpy).toHaveBeenCalledWith(SERVER_URL);
    });

    it('catches thrown errors, reports ended, and clears mapping', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentUser as jest.Mock).mockResolvedValueOnce({id: 'user1', locale: 'en'});
        (getCurrentCall as jest.Mock).mockReturnValueOnce(null);
        (hasBluetoothPermission as jest.Mock).mockRejectedValueOnce(new Error('permission crash'));

        const {onCallAnswered} = loadAndInit();
        await onCallAnswered({uuid: 'u1'});

        expect(CallsNative.reportEnded).toHaveBeenCalledWith('u1', 'failed');
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
    });
});

describe('onCallDeclined', () => {
    it('does nothing when no mapping exists', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(undefined);
        const {onCallDeclined} = loadAndInit();
        await onCallDeclined({uuid: 'u1'});
        expect(dismissIncomingCall).not.toHaveBeenCalled();
    });

    it('clears mapping and dismisses the incoming call when mapping exists', async () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce({
            serverUrl: SERVER_URL,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        const {onCallDeclined} = loadAndInit();
        await onCallDeclined({uuid: 'u1'});
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
        expect(dismissIncomingCall).toHaveBeenCalledWith(SERVER_URL, 'ch1');
    });
});

describe('onCallEnded', () => {
    it('does nothing when no mapping exists', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(undefined);
        const {onCallEnded} = loadAndInit();
        onCallEnded({uuid: 'u1'});
        expect(leaveCall).not.toHaveBeenCalled();
    });

    it('leaves the call when the current call matches the ended mapping', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce({
            serverUrl: SERVER_URL,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'ch1'});
        const {onCallEnded} = loadAndInit();
        onCallEnded({uuid: 'u1'});
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
        expect(leaveCall).toHaveBeenCalledTimes(1);
    });

    it('does not leave when the current call is on a different channel', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce({
            serverUrl: SERVER_URL,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'other-channel'});
        const {onCallEnded} = loadAndInit();
        onCallEnded({uuid: 'u1'});
        expect(clearNativeCallMapping).toHaveBeenCalledWith('u1');
        expect(leaveCall).not.toHaveBeenCalled();
    });
});

describe('onMuteChanged', () => {
    const mapping = {serverUrl: SERVER_URL, channelId: 'ch1', postId: '', threadId: ''};

    it('mutes the JS side when native reports muted=true', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'ch1'});
        const {onMuteChanged} = loadAndInit();
        onMuteChanged({uuid: 'u1', muted: true});
        expect(muteMyself).toHaveBeenCalled();
        expect(unmuteMyself).not.toHaveBeenCalled();
    });

    it('unmutes the JS side when native reports muted=false', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'ch1'});
        const {onMuteChanged} = loadAndInit();
        onMuteChanged({uuid: 'u1', muted: false});
        expect(unmuteMyself).toHaveBeenCalled();
        expect(muteMyself).not.toHaveBeenCalled();
    });

    it('does nothing when no mapping exists', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(undefined);
        const {onMuteChanged} = loadAndInit();
        onMuteChanged({uuid: 'u1', muted: true});
        expect(muteMyself).not.toHaveBeenCalled();
        expect(unmuteMyself).not.toHaveBeenCalled();
    });

    it('does nothing when the current call does not match the mapping', () => {
        (getNativeCallMapping as jest.Mock).mockReturnValueOnce(mapping);
        (getCurrentCall as jest.Mock).mockReturnValueOnce({serverUrl: SERVER_URL, channelId: 'other-channel'});
        const {onMuteChanged} = loadAndInit();
        onMuteChanged({uuid: 'u1', muted: true});
        expect(muteMyself).not.toHaveBeenCalled();
        expect(unmuteMyself).not.toHaveBeenCalled();
    });
});
