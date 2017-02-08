// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import {addDatesToPostList} from 'service/utils/post_utils';

describe('addDatesToPostList', () => {
    it('single post', () => {
        const input = [{create_at: 1486533600000}];

        const output = addDatesToPostList(input);

        assert.notEqual(input, output);
        assert.deepEqual(output, [
            input[0],
            new Date(input[0].create_at)
        ]);
    });

    it('two posts on same day', () => {
        const input = [
            {create_at: 1486533600000},
            {create_at: 1486533601000}
        ];

        const output = addDatesToPostList(input);

        assert.notEqual(input, output);
        assert.deepEqual(output, [
            input[0],
            input[1],
            new Date(input[1].create_at)
        ]);
    });

    it('two posts on different days', () => {
        const input = [
            {create_at: 1486533600000},
            {create_at: 1486620000000}
        ];

        const output = addDatesToPostList(input);

        assert.notEqual(input, output);
        assert.deepEqual(output, [
            input[0],
            new Date(input[0].create_at),
            input[1],
            new Date(input[1].create_at)
        ]);
    });

    it('multiple posts', () => {
        const input = [
            {create_at: 1486533600000},
            {create_at: 1486533601000},
            {create_at: 1486620000000},
            {create_at: 1486706400000},
            {create_at: 1486706401000}
        ];

        const output = addDatesToPostList(input);

        assert.notEqual(input, output);
        assert.deepEqual(output, [
            input[0],
            input[1],
            new Date(input[1].create_at),
            input[2],
            new Date(input[2].create_at),
            input[3],
            input[4],
            new Date(input[4].create_at)
        ]);
    });
});
