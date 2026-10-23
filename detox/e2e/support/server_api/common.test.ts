// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import axios from 'axios';

import {getResponseFromError} from './common';

describe('getResponseFromError', () => {
    it('should name the network error codes when the request gets no response', async () => {
        // localhost resolves to more than one address, so a refused connection is an AggregateError.
        const err = await axios.get('http://localhost:1', {timeout: 5000}).then(() => null, (e) => e);
        const {error, status} = getResponseFromError(err);

        assert.equal(status, 0);
        assert.match(error.message, /No response from server: .*\(ECONNREFUSED\)/);
    });
});
