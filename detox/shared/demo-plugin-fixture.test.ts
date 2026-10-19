// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {demoPluginInstallPlan} from './demo-plugin-fixture';

describe('demoPluginInstallPlan', () => {
    it('is a no-op when the plugin is already active (provisioned CI / local)', () => {
        assert.equal(demoPluginInstallPlan({isActive: true, isInstalled: true}), 'noop');
    });

    it('enables an installed-but-inactive plugin instead of re-downloading', () => {
        assert.equal(demoPluginInstallPlan({isActive: false, isInstalled: true}), 'enable');
    });

    it('uploads the runner fixture when the plugin is missing — never install_from_url', () => {
        assert.equal(demoPluginInstallPlan({isActive: false, isInstalled: false}), 'upload-fixture');
        assert.equal(demoPluginInstallPlan({}), 'upload-fixture');
    });
});
