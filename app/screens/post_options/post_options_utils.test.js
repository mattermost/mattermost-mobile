// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getInitialPosition, MAX_INITIAL_POSITION_MULTIPLIER} from './post_options_utils';

describe('should match return value of getInitialPosition', () => {
    const testCases = [
        {
            input: {deviceHeight: 600, marginFromTop: 400},
            output: 200,
        }, {
            input: {deviceHeight: 600, marginFromTop: 300},
            output: 300,
        }, {
            input: {deviceHeight: 600, marginFromTop: 50},
            output: 353.5,
        }, {
            input: {deviceHeight: 1000, marginFromTop: 300},
            output: 554.5,
        }, {
            input: {deviceHeight: 1000, marginFromTop: 400},
            output: 600,
        },
    ];

    for (const testCase of testCases) {
        const {input, output} = testCase;
        const maxInitialPosition = input.deviceHeight * MAX_INITIAL_POSITION_MULTIPLIER;

        test('should match initial position', () => {
            const initialPosition = getInitialPosition(input.deviceHeight, input.marginFromTop);
            expect(initialPosition).toEqual(output);

            // should not exceed maximum initial position at 60% of screen height
            expect(initialPosition).toBeLessThanOrEqual(maxInitialPosition);
        });
    }
});
