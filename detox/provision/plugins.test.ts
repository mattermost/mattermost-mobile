// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {strayPluginIds} from './plugins';

describe('strayPluginIds', () => {
    it('should keep prepackaged and provisioned plugins and return the rest', () => {
        const active = [
            {id: 'com.mattermost.calls'},
            {id: 'com.mattermost.demo-plugin'},
            {id: 'mattermost-ai'},
            {id: 'zoom'},
            {id: 'com.example.leftover'},
        ];
        assert.deepEqual(strayPluginIds(active), ['com.example.leftover']);
    });
});
