// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative from '@mattermost/calls-native';
import {Platform} from 'react-native';

import {getCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import {getChannelById} from '@queries/servers/channel';
import {getTeamById} from '@queries/servers/team';

import {
    clearNativeCallMapping,
    endNativeCall,
    getNativeCallMapping,
    getNativeCallUUIDForCall,
    mirrorMuteToNativeCall,
    registerOutgoingNativeCall,
    reportNativeCallConnected,
    setNativeCallMapping,
} from './native_call';

jest.mock('@calls/state', () => ({
    getCurrentCall: jest.fn(),
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        scheduleBackgroundCloseIfNeeded: jest.fn(),
        initializeClient: jest.fn(),
    },
}));
jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(),
}));
jest.mock('@queries/servers/team', () => ({
    getTeamById: jest.fn(),
}));

const serverUrl = 'https://example.com';

const clearAllMappings = () => {
    ['uuid-a', 'uuid-b', 'uuid-1', 'uuid-2', 'native-uuid'].forEach(clearNativeCallMapping);
};

beforeEach(async () => {
    clearAllMappings();
    jest.clearAllMocks();
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('mapping store', () => {
    it('set + get round-trip', () => {
        setNativeCallMapping('uuid-a', {
            serverUrl,
            channelId: 'ch1',
            postId: 'p1',
            threadId: 't1',
        });
        expect(getNativeCallMapping('uuid-a')).toEqual({
            serverUrl,
            channelId: 'ch1',
            postId: 'p1',
            threadId: 't1',
        });
    });

    it('clear removes the entry', () => {
        setNativeCallMapping('uuid-a', {serverUrl: 'u', channelId: 'c', postId: '', threadId: ''});
        clearNativeCallMapping('uuid-a');
        expect(getNativeCallMapping('uuid-a')).toBeUndefined();
    });

    it('reverse lookup returns the uuid for matching server+channel', () => {
        setNativeCallMapping('uuid-a', {serverUrl: 'sA', channelId: 'cA', postId: '', threadId: ''});
        setNativeCallMapping('uuid-b', {serverUrl: 'sB', channelId: 'cB', postId: '', threadId: ''});
        expect(getNativeCallUUIDForCall('sA', 'cA')).toBe('uuid-a');
        expect(getNativeCallUUIDForCall('sB', 'cB')).toBe('uuid-b');
    });

    it('reverse lookup returns undefined when no mapping matches', () => {
        setNativeCallMapping('uuid-a', {serverUrl: 'sA', channelId: 'cA', postId: '', threadId: ''});
        expect(getNativeCallUUIDForCall('sA', 'cOther')).toBeUndefined();
        expect(getNativeCallUUIDForCall('sOther', 'cA')).toBeUndefined();
    });
});

describe('clearNativeCallMapping wrapper', () => {
    const WebsocketManager = require('@managers/websocket_manager').default;

    it('schedules background close only after the last mapping is cleared', () => {
        setNativeCallMapping('uuid-1', {serverUrl: 'sA', channelId: 'c1', postId: '', threadId: ''});
        setNativeCallMapping('uuid-2', {serverUrl: 'sA', channelId: 'c2', postId: '', threadId: ''});

        clearNativeCallMapping('uuid-1');
        expect(WebsocketManager.scheduleBackgroundCloseIfNeeded).not.toHaveBeenCalled();

        clearNativeCallMapping('uuid-2');
        expect(WebsocketManager.scheduleBackgroundCloseIfNeeded).toHaveBeenCalledTimes(1);
    });

});

describe('registerOutgoingNativeCall', () => {
    it('skips when not on iOS', async () => {
        const originalOS = Platform.OS;
        Object.defineProperty(Platform, 'OS', {get: () => 'android'});

        const result = await registerOutgoingNativeCall(serverUrl, 'ch1');

        Object.defineProperty(Platform, 'OS', {get: () => originalOS});

        expect(result).toBeUndefined();
        expect(CallsNative.reportOutgoingCall).not.toHaveBeenCalled();
    });

    it('skips when a mapping already exists (inbound-push case)', async () => {
        setNativeCallMapping('uuid-a', {
            serverUrl,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        const result = await registerOutgoingNativeCall(serverUrl, 'ch1');
        expect(result).toBeUndefined();
        expect(CallsNative.reportOutgoingCall).not.toHaveBeenCalled();
    });

    it('uses DM/GM displayName as-is when channel has no teamId', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'Alice, Bob',
            teamId: '',
        });

        await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(CallsNative.reportOutgoingCall).toHaveBeenCalledWith({
            channelId: 'ch1',
            calleeName: 'Alice, Bob',
        });
    });

    it('suffixes team name for public/private channels', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'town-square',
            teamId: 'team1',
        });
        (getTeamById as jest.Mock).mockResolvedValueOnce({
            displayName: 'Engineering',
        });

        await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(CallsNative.reportOutgoingCall).toHaveBeenCalledWith({
            channelId: 'ch1',
            calleeName: 'town-square (Engineering)',
        });
    });

    it('truncates very long channel and team names with ellipsis per segment', async () => {
        // 42-char channel name → channel budget is 40, expect truncation
        // 33-char team name → team budget is 30, expect truncation
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'this-channel-name-is-very-very-long-indeed',
            teamId: 'team1',
        });
        (getTeamById as jest.Mock).mockResolvedValueOnce({
            displayName: 'an-extremely-long-team-name-here!',
        });

        await registerOutgoingNativeCall(serverUrl, 'ch1');

        const call = (CallsNative.reportOutgoingCall as jest.Mock).mock.calls[0][0];
        expect(call.calleeName).toMatch(/^.{40} \(.{30}\)$/);

        // Each segment ended in an ellipsis indicating truncation occurred.
        const [channelPart, teamPart] = call.calleeName.split(' (');
        expect(channelPart.endsWith('…')).toBe(true);
        expect(teamPart.endsWith('…)')).toBe(true);
    });

    it('stores the mapping returned by the native side', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'Alice',
            teamId: '',
        });
        (CallsNative.reportOutgoingCall as jest.Mock).mockResolvedValueOnce({uuid: 'uuid-1'});

        const uuid = await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(uuid).toBe('uuid-1');
        expect(getNativeCallMapping('uuid-1')).toEqual({
            serverUrl,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
    });

    it('returns undefined when the native call rejects (no mapping written)', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'Alice',
            teamId: '',
        });
        (CallsNative.reportOutgoingCall as jest.Mock).mockRejectedValueOnce(new Error('boom'));

        const uuid = await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(uuid).toBeUndefined();
        expect(getNativeCallMapping('native-uuid')).toBeUndefined();
    });

    it('still reports the call with empty calleeName when channel lookup returns null', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce(null);

        await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(CallsNative.reportOutgoingCall).toHaveBeenCalledWith({
            channelId: 'ch1',
            calleeName: '',
        });
    });

    it('falls back to channel-only name when team lookup returns null', async () => {
        (getChannelById as jest.Mock).mockResolvedValueOnce({
            displayName: 'town-square',
            teamId: 'team1',
        });
        (getTeamById as jest.Mock).mockResolvedValueOnce(null);

        await registerOutgoingNativeCall(serverUrl, 'ch1');

        expect(CallsNative.reportOutgoingCall).toHaveBeenCalledWith({
            channelId: 'ch1',
            calleeName: 'town-square',
        });
    });

    it('returns undefined when the server database is unavailable', async () => {
        // Destroy the DB initialized in beforeEach so getServerDatabaseAndOperator throws.
        await DatabaseManager.destroyServerDatabase(serverUrl);

        const uuid = await registerOutgoingNativeCall(serverUrl, 'ch1');
        expect(uuid).toBeUndefined();
        expect(CallsNative.reportOutgoingCall).not.toHaveBeenCalled();
    });
});

describe('reportNativeCallConnected', () => {
    it('forwards to native when uuid is given', () => {
        reportNativeCallConnected('uuid-a');
        expect(CallsNative.reportConnected).toHaveBeenCalledWith('uuid-a');
    });

    it('no-op when uuid is undefined', () => {
        reportNativeCallConnected(undefined);
        expect(CallsNative.reportConnected).not.toHaveBeenCalled();
    });
});

describe('endNativeCall', () => {
    it('clears mapping and reports ended', () => {
        setNativeCallMapping('uuid-a', {
            serverUrl,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        endNativeCall(serverUrl, 'ch1', 'remoteEnded');
        expect(getNativeCallMapping('uuid-a')).toBeUndefined();
        expect(CallsNative.reportEnded).toHaveBeenCalledWith('uuid-a', 'remoteEnded');
    });

    it('no-op when no mapping matches', () => {
        endNativeCall(serverUrl, 'unknown', 'remoteEnded');
        expect(CallsNative.reportEnded).not.toHaveBeenCalled();
    });

    it('skips when not on iOS', () => {
        const originalOS = Platform.OS;
        Object.defineProperty(Platform, 'OS', {get: () => 'android'});

        setNativeCallMapping('uuid-a', {
            serverUrl,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });
        endNativeCall(serverUrl, 'ch1', 'remoteEnded');

        Object.defineProperty(Platform, 'OS', {get: () => originalOS});

        expect(CallsNative.reportEnded).not.toHaveBeenCalled();
    });
});

describe('mirrorMuteToNativeCall', () => {
    it('forwards to native when there is a current call with a mapping', () => {
        (getCurrentCall as jest.Mock).mockReturnValueOnce({
            serverUrl,
            channelId: 'ch1',
        });
        setNativeCallMapping('uuid-a', {
            serverUrl,
            channelId: 'ch1',
            postId: '',
            threadId: '',
        });

        mirrorMuteToNativeCall(true);

        expect(CallsNative.setMuted).toHaveBeenCalledWith('uuid-a', true);
    });

    it('no-op when there is no current call', () => {
        (getCurrentCall as jest.Mock).mockReturnValueOnce(null);
        mirrorMuteToNativeCall(true);
        expect(CallsNative.setMuted).not.toHaveBeenCalled();
    });

    it('no-op when the current call has no native mapping', () => {
        (getCurrentCall as jest.Mock).mockReturnValueOnce({
            serverUrl,
            channelId: 'unmapped',
        });
        mirrorMuteToNativeCall(false);
        expect(CallsNative.setMuted).not.toHaveBeenCalled();
    });

    it('skips when not on iOS', () => {
        const originalOS = Platform.OS;
        Object.defineProperty(Platform, 'OS', {get: () => 'android'});

        mirrorMuteToNativeCall(true);

        Object.defineProperty(Platform, 'OS', {get: () => originalOS});

        expect(CallsNative.setMuted).not.toHaveBeenCalled();

        // Confirm we returned before the getCurrentCall lookup.
        expect(getCurrentCall).not.toHaveBeenCalled();
    });
});
