// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {DEMO_PLUGIN_REQUIREMENT, REQUIRED_PLUGINS} from './constants';
import {demoPluginSettingsPatch, demoPluginViolation, strayPluginIds} from './plugins';

describe('strayPluginIds', () => {
    it('should keep prepackaged and provisioned plugins and return the rest', () => {
        const active = [
            {id: 'com.mattermost.calls'},
            {id: 'com.mattermost.demo-plugin'},
            {id: 'mattermost-ai'},
            {id: 'zoom'},
            {id: 'com.example.leftover'},
        ];
        assert.deepEqual(strayPluginIds(active, [...REQUIRED_PLUGINS, DEMO_PLUGIN_REQUIREMENT]), ['com.example.leftover']);
    });

    it('should report the demo plugin as stray on a server it is not provisioned for', () => {
        const active = [{id: 'com.mattermost.demo-plugin'}, {id: 'com.example.leftover'}];
        assert.deepEqual(strayPluginIds(active, REQUIRED_PLUGINS), ['com.mattermost.demo-plugin', 'com.example.leftover']);
    });
});

describe('demoPluginViolation', () => {
    const active = [{id: 'com.mattermost.calls'}, {id: 'com.mattermost.demo-plugin'}];

    it('should flag an active demo plugin on a server provisioned without it', () => {
        assert.match(demoPluginViolation(active, false) ?? '', /com\.mattermost\.demo-plugin is active on a server provisioned without it/);
    });

    it('should allow the demo plugin when it was requested, or when it is not active', () => {
        assert.equal(demoPluginViolation(active, true), undefined);
        assert.equal(demoPluginViolation([{id: 'com.mattermost.calls'}], false), undefined);
        assert.equal(demoPluginViolation(undefined, false), undefined);
    });
});

describe('demoPluginSettingsPatch', () => {
    it('should turn DialogOnlyMode on for a missing or empty entry', () => {
        assert.deepEqual(demoPluginSettingsPatch({}), {DialogOnlyMode: true});
    });

    it('should keep other settings and replace any spelling of DialogOnlyMode', () => {
        assert.deepEqual(demoPluginSettingsPatch({username: 'demo', dialogonlymode: false}), {username: 'demo', DialogOnlyMode: true});
    });

    it('should leave an entry that already has DialogOnlyMode on', () => {
        assert.equal(demoPluginSettingsPatch({DialogOnlyMode: true}), null);
        assert.equal(demoPluginSettingsPatch({dialogonlymode: true, username: 'demo'}), null);
    });

    it('should not treat a string "true" as on', () => {
        assert.deepEqual(demoPluginSettingsPatch({dialogonlymode: 'true'}), {DialogOnlyMode: true});
    });
});
