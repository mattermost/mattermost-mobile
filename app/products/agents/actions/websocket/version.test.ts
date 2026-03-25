// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsVersion} from '@agents/actions/local/version';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';

import {
    handleAgentsPluginEnabled,
    handleAgentsPluginDisabled,
} from './version';

const serverUrl = 'test-server.com';

jest.mock('@agents/actions/local/version');

describe('handleAgentsPluginEnabled', () => {
    it('should set agents version when plugin is enabled with correct manifest', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        await handleAgentsPluginEnabled(serverUrl, manifest);

        expect(setAgentsVersion).toHaveBeenCalledWith(serverUrl, '2.0.0');
        expect(setAgentsVersion).toHaveBeenCalledTimes(1);
    });

    it('should not set agents version when manifest id does not match agents plugin id', async () => {
        const manifest: ClientPluginManifest = {
            id: 'other-plugin',
            version: '1.0.0',
            webapp: {
                bundle_path: '/static/other.js',
            },
        };

        await handleAgentsPluginEnabled(serverUrl, manifest);

        expect(setAgentsVersion).not.toHaveBeenCalled();
    });

    it('should handle empty version string', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        await handleAgentsPluginEnabled(serverUrl, manifest);

        expect(setAgentsVersion).toHaveBeenCalledWith(serverUrl, '');
    });
});

describe('handleAgentsPluginDisabled', () => {
    it('should clear agents version when plugin is disabled with correct manifest', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        await handleAgentsPluginDisabled(serverUrl, manifest);

        expect(setAgentsVersion).toHaveBeenCalledWith(serverUrl, '');
    });

    it('should not clear agents version when manifest id does not match agents plugin id', async () => {
        const manifest: ClientPluginManifest = {
            id: 'other-plugin',
            version: '1.0.0',
            webapp: {
                bundle_path: '/static/other.js',
            },
        };

        await handleAgentsPluginDisabled(serverUrl, manifest);

        expect(setAgentsVersion).not.toHaveBeenCalled();
    });
});
