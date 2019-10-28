// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {
    getMatchTermForAtMention,
    filterMembersNotInChannel,
} from 'app/selectors/autocomplete';

/* eslint-disable max-nested-callbacks */

describe('Selectors.Autocomplete', () => {
    describe('getMatchTermForAtMention', () => {
        describe('match non-search at mentions', () => {
            const testCases = [
                ['@', ''],
                ['@a', 'a'],
                ['@match', 'match'],
                ['@Username', 'username'],
                ['@USERNAME', 'username'],
                ['not a match', null],
            ];

            testCases.forEach((testCase) => {
                it(testCase[0], () => {
                    const value = testCase[0];
                    const isSearch = false;
                    const expected = testCase[1];
                    const actual = getMatchTermForAtMention(value, isSearch);

                    assert.equal(expected, actual);
                });
            });
        });

        describe('match search at mentions', () => {
            const testCases = [
                ['from:', ''],
                ['from:a', 'a'],
                ['from:match', 'match'],
                ['from:not a match', null],
                ['from:Username', 'username'],
                ['from:USERNAME', 'username'],
                ['from: space', 'space'],
            ];

            testCases.forEach((testCase) => {
                it(testCase[0], () => {
                    const value = testCase[0];
                    const isSearch = true;
                    const expected = testCase[1];
                    const actual = getMatchTermForAtMention(value, isSearch);

                    assert.equal(expected, actual);
                });
            });
        });
    });

    it('Should return profiles not in channel', () => {
        const state = {
            entities: {
                channels: {
                    currentChannelId: 'current-channel-id',
                },
                users: {
                    currentUserId: 'current-user-id',
                    profiles: {
                        'current-user-id': {id: 'current-user-id', username: 'current', detele_at: 0},
                        'test-user-id': {id: 'test-user-id', username: 'test', first_name: 'Test', last_name: 'User', email: 'test@example.com', delete_at: 0},
                        'another-user-id': {id: 'another-user-id', username: 'another', first_name: 'Another', last_name: 'One', email: 'another@example.com', delete_at: 0},
                        'deleted-user-id': {id: 'deleted-user-id', username: 'deleted', first_name: 'Remvoed', last_name: 'Friend', email: 'deleted@example.com', delete_at: 123},
                    },
                    profilesNotInChannel: {
                        'current-channel-id': new Set(['test-user-id', 'another-user-id', 'deleted-user-id']),
                    },
                },
            },
        };

        let profiles = filterMembersNotInChannel(state, '');
        expect(profiles.length).toBe(2);

        // filter to get the current user, should return zero results
        profiles = filterMembersNotInChannel(state, 'current');
        expect(profiles.length).toBe(0);

        profiles = filterMembersNotInChannel(state, 'tes');
        expect(profiles.length).toBe(1);

        profiles = filterMembersNotInChannel(state, 'one');
        expect(profiles.length).toBe(1);

        profiles = filterMembersNotInChannel(state, 'example');
        expect(profiles.length).toBe(2);
    });
});
