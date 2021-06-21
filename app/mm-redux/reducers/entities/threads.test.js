// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import deepFreeze from '@mm-redux/utils/deep_freeze';
import {TeamTypes, ThreadTypes} from '@mm-redux/action_types';
import threadsReducer from '@mm-redux/reducers/entities/threads';

describe('threads', () => {
    test('RECEIVED_THREADS should update the state', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {},
        });

        const nextState = threadsReducer(state, {
            type: ThreadTypes.RECEIVED_THREADS,
            data: {
                team_id: 'a',
                threads: [
                    {id: 't1'},
                ],
                total: 3,
                total_unread_threads: 0,
                total_unread_mentions: 1,
            },
        });

        expect(nextState).not.toEqual(state);
        expect(nextState.threads.t1).toEqual({
            id: 't1',
        });
        expect(nextState.counts.a).toEqual({
            total: 3,
            total_unread_threads: 0,
            total_unread_mentions: 1,
        });
        expect(nextState.threadsInTeam.a).toContain('t1');
    });
    test('LEAVE_TEAM should clean the state', () => {
        const state = deepFreeze({
            threadsInTeam: {},
            threads: {},
            counts: {},
        });

        let nextState = threadsReducer(state, {
            type: ThreadTypes.RECEIVED_THREADS,
            data: {
                team_id: 'a',
                threads: [
                    {id: 't1'},
                ],
                total: 3,
                unread_mentions_per_channel: {},
                total_unread_threads: 0,
                total_unread_mentions: 1,
            },
        });

        expect(nextState).not.toEqual(state);

        // leave team
        nextState = threadsReducer(state, {
            type: TeamTypes.LEAVE_TEAM,
            data: {
                id: 'a',
            },
        });

        expect(nextState.threads.t1).toBe(undefined);
        expect(nextState.counts.a).toBe(undefined);
        expect(nextState.threadsInTeam.a).toBe(undefined);
    });
});
