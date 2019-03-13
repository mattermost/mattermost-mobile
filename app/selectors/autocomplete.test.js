// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {
    getMatchTermForAtMention,
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
});
