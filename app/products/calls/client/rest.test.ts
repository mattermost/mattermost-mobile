// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import clientCalls from './rest';

describe('ClientCalls', () => {
    const mockDoFetch = jest.fn();
    const mockGetCallsRoute = jest.fn(() => '/plugins/com.plugins.calls');

    const BaseClass = class {
        doFetch = mockDoFetch;
        getCallsRoute = mockGetCallsRoute;
    };
    const Client = clientCalls(BaseClass);
    const client = new Client();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getEnabled', () => {
        it('returns true when version check succeeds', async () => {
            mockDoFetch.mockResolvedValueOnce({});
            const result = await client.getEnabled();
            expect(result).toBe(true);
            expect(mockDoFetch).toHaveBeenCalledWith('/plugins/com.plugins.calls/version', {method: 'get'});
        });

        it('returns false when version check fails', async () => {
            mockDoFetch.mockRejectedValueOnce(new Error());
            const result = await client.getEnabled();
            expect(result).toBe(false);
        });
    });

    describe('getCalls', () => {
        it('makes correct API call', async () => {
            await client.getCalls();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/channels?mobilev2=true',
                {method: 'get', groupLabel: undefined},
            );
        });

        it('passes groupLabel when provided', async () => {
            await client.getCalls('Server Switch');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/channels?mobilev2=true',
                {method: 'get', groupLabel: 'Server Switch'},
            );
        });
    });

    describe('getCallForChannel', () => {
        it('makes correct API call', async () => {
            await client.getCallForChannel('channel-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/channel-id?mobilev2=true',
                {method: 'get'},
            );
        });
    });

    describe('enableChannelCalls', () => {
        it('makes correct API call to enable', async () => {
            await client.enableChannelCalls('channel-id', true);
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/channel-id',
                {method: 'post', body: {enabled: true}},
            );
        });

        it('makes correct API call to disable', async () => {
            await client.enableChannelCalls('channel-id', false);
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/channel-id',
                {method: 'post', body: {enabled: false}},
            );
        });
    });

    describe('endCall', () => {
        it('makes correct API call', async () => {
            await client.endCall('channel-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/channel-id/end',
                {method: 'post'},
            );
        });
    });

    describe('host actions', () => {
        it('makes correct API call for hostMake', async () => {
            await client.hostMake('call-id', 'new-host-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/make',
                {method: 'post', body: {new_host_id: 'new-host-id'}},
            );
        });

        it('makes correct API call for hostMute', async () => {
            await client.hostMute('call-id', 'session-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/mute',
                {method: 'post', body: {session_id: 'session-id'}},
            );
        });

        it('makes correct API call for hostMuteOthers', async () => {
            await client.hostMuteOthers('call-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/mute-others',
                {method: 'post'},
            );
        });

        it('makes correct API call for hostScreenOff', async () => {
            await client.hostScreenOff('call-id', 'session-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/screen-off',
                {method: 'post', body: {session_id: 'session-id'}},
            );
        });

        it('makes correct API call for hostLowerHand', async () => {
            await client.hostLowerHand('call-id', 'session-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/lower-hand',
                {method: 'post', body: {session_id: 'session-id'}},
            );
        });

        it('makes correct API call for hostRemove', async () => {
            await client.hostRemove('call-id', 'session-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/host/remove',
                {method: 'post', body: {session_id: 'session-id'}},
            );
        });
    });

    describe('getCallsConfig', () => {
        it('makes correct API call', async () => {
            await client.getCallsConfig();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/config',
                {method: 'get', groupLabel: undefined},
            );
        });

        it('passes groupLabel when provided', async () => {
            await client.getCallsConfig('Server Switch');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/config',
                {method: 'get', groupLabel: 'Server Switch'},
            );
        });
    });

    describe('getVersion', () => {
        it('makes correct API call', async () => {
            await client.getVersion();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/version',
                {method: 'get', groupLabel: undefined},
            );
        });

        it('passes groupLabel when provided', async () => {
            await client.getVersion('Server Switch');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/version',
                {method: 'get', groupLabel: 'Server Switch'},
            );
        });

        it('returns empty object on error', async () => {
            mockDoFetch.mockRejectedValueOnce(new Error());
            const result = await client.getVersion();
            expect(result).toEqual({});
        });
    });

    describe('genTURNCredentials', () => {
        it('makes correct API call', async () => {
            await client.genTURNCredentials();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/turn-credentials',
                {method: 'get'},
            );
        });
    });

    describe('recording actions', () => {
        it('makes correct API call for startCallRecording', async () => {
            await client.startCallRecording('call-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/recording/start',
                {method: 'post'},
            );
        });

        it('makes correct API call for stopCallRecording', async () => {
            await client.stopCallRecording('call-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/call-id/recording/stop',
                {method: 'post'},
            );
        });
    });

    describe('dismissCall', () => {
        it('makes correct API call', async () => {
            await client.dismissCall('channel-id');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/com.plugins.calls/calls/channel-id/dismiss-notification',
                {method: 'post'},
            );
        });
    });
});
