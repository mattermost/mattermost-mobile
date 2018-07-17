// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {isDateLine} from './utils.js';

describe('DateHeader', () => {
    it('isDateLine', () => {
        assert.equal(isDateLine(''), false);
        assert.equal(isDateLine('date'), false);
        assert.equal(isDateLine('date-'), true);
        assert.equal(isDateLine('date-0'), true);
        assert.equal(isDateLine('date-1531152392'), true);
        assert.equal(isDateLine('date-1531152392-index'), true);
    });
});
