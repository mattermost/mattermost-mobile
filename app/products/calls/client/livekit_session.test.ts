// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isLiveKitSessionResponse} from './livekit_session';

describe('isLiveKitSessionResponse', () => {
    const makeResponse = (overrides: Record<string, unknown> = {}) => ({
        session_id: 'session-id',
        token: 'jwt-token',
        url: 'wss://livekit.example/',
        call_state: {id: 'call-id', sessions: []},
        ...overrides,
    });

    it('accepts a wss room url', () => {
        expect(isLiveKitSessionResponse(makeResponse(), 'https://server.example')).toBe(true);
    });

    it('rejects a ws room url when the server is https', () => {
        expect(isLiveKitSessionResponse(makeResponse({url: 'ws://evil.example/'}), 'https://server.example')).toBe(false);
    });

    it('accepts a ws room url when the server is http', () => {
        expect(isLiveKitSessionResponse(makeResponse({url: 'ws://livekit.example/'}), 'http://server.example')).toBe(true);
    });

    it('rejects a room url whose scheme is not at the start', () => {
        expect(isLiveKitSessionResponse(makeResponse({url: 'evil wss://livekit.example/'}), 'https://server.example')).toBe(false);
    });

    it('rejects a room url with another scheme', () => {
        expect(isLiveKitSessionResponse(makeResponse({url: 'https://livekit.example/'}), 'https://server.example')).toBe(false);
    });

    it.each([
        ['null', null],
        ['a missing token', makeResponse({token: undefined})],
        ['a missing session id', makeResponse({session_id: undefined})],
        ['a missing call state', makeResponse({call_state: undefined})],
        ['call state without sessions', makeResponse({call_state: {id: 'call-id'}})],
    ])('rejects a response with %s', (_name, response) => {
        expect(isLiveKitSessionResponse(response, 'https://server.example')).toBe(false);
    });
});
