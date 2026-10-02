// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsVersion} from '@agents/actions/local/version';
import {clearAIBots, fetchAIBots} from '@agents/actions/remote/bots';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';

import {
    handleAgentsPluginEnabled,
    handleAgentsPluginDisabled,
} from './version';

const serverUrl = 'test-server.com';

jest.mock('@agents/actions/local/version');
jest.mock('@agents/actions/remote/bots');

beforeEach(() => {
    jest.clearAllMocks();
});

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
        expect(fetchAIBots).toHaveBeenCalledWith(serverUrl);
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
        expect(fetchAIBots).not.toHaveBeenCalled();
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

    it('should clear stored bots instead of fetching when the enabled plugin is unsupported', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '1.7.2',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        await handleAgentsPluginEnabled(serverUrl, manifest);

        expect(fetchAIBots).not.toHaveBeenCalled();
        expect(clearAIBots).toHaveBeenCalledWith(serverUrl);
    });
});

describe('handleAgentsPluginDisabled', () => {
    it('should clear the agents version and stored bots when plugin is disabled', async () => {
        const manifest: ClientPluginManifest = {
            id: AGENTS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/agents.js',
            },
        };

        await handleAgentsPluginDisabled(serverUrl, manifest);

        expect(setAgentsVersion).toHaveBeenCalledWith(serverUrl, '');
        expect(clearAIBots).toHaveBeenCalledWith(serverUrl);
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
        expect(clearAIBots).not.toHaveBeenCalled();
    });
});
