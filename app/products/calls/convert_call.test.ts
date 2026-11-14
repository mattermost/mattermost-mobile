// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createCallAndAddToIds} from './convert_call';

import type {CallState} from '@mattermost/calls/lib/types';

const callState = (extra: Record<string, unknown> = {}, sessions: unknown[] = []) => ({
    id: 'call-id',
    start_at: 100,
    sessions,
    thread_id: 'thread-id',
    post_id: 'post-id',
    screen_sharing_session_id: '',
    owner_id: 'owner',
    host_id: 'owner',
    ...extra,
}) as unknown as CallState;

describe('createCallAndAddToIds', () => {
    it('leaves the phone leg\'s session out of the converted call', () => {
        const ids = new Set<string>();
        const call = createCallAndAddToIds('channel', callState({}, [
            {session_id: 's1', user_id: 'user1', unmuted: true, raised_hand: 0},
            {session_id: 'sip', user_id: '', unmuted: true, raised_hand: 0, is_sip_participant: true},
        ]), ids);

        expect(Object.keys(call.sessions)).toEqual(['s1']);
        expect(Array.from(ids)).toEqual(['user1']);
    });

    it('shows a phone call\'s display number, falling back to the dialed number', () => {
        expect(createCallAndAddToIds('channel', callState({type: 'phone', phone_number: '+15551234567', display_number: '+1 555 123 4567'})).phone).toBe('+1 555 123 4567');
        expect(createCallAndAddToIds('channel', callState({type: 'phone', phone_number: '+15551234567'})).phone).toBe('+15551234567');
        expect(createCallAndAddToIds('channel', callState({phone_number: '+15551234567'})).phone).toBeUndefined();
    });
});
