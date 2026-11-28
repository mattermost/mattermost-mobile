// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {isSpecOwnedServerSetup} from './server_role';

describe('isSpecOwnedServerSetup', () => {
    it('should let specs own server setup locally', () => {
        assert.equal(isSpecOwnedServerSetup({}), true);
    });

    it('should leave server setup to provisioning on the legacy CI pipeline', () => {
        assert.equal(isSpecOwnedServerSetup({CI: 'true'}), false);
        assert.equal(isSpecOwnedServerSetup({CI: 'true', E2E_POOL_GUARD: 'shared'}), false);
    });

    it('should let specs own server setup on the v2 pipeline', () => {
        assert.equal(isSpecOwnedServerSetup({CI: 'true', E2E_PIPELINE: 'v2'}), true);
    });
});
