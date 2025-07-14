// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setPlaybooksVersion} from '@playbooks/actions/local/version';
import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';

import {
    handlePlaybookPluginEnabled,
    handlePlaybookPluginDisabled,
} from './version';

const serverUrl = 'test-server.com';

jest.mock('@playbooks/actions/local/version');

describe('handlePlaybookPluginEnabled', () => {
    it('should set playbooks version when plugin is enabled with correct manifest', async () => {
        const manifest: ClientPluginManifest = {
            id: PLAYBOOKS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/playbooks.js',
            },
        };

        await handlePlaybookPluginEnabled(serverUrl, manifest);

        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '2.0.0');
        expect(setPlaybooksVersion).toHaveBeenCalledTimes(1);
    });

    it('should not set playbooks version when manifest id does not match playbooks plugin id', async () => {
        const manifest: ClientPluginManifest = {
            id: 'other-plugin',
            version: '1.0.0',
            webapp: {
                bundle_path: '/static/other.js',
            },
        };

        await handlePlaybookPluginEnabled(serverUrl, manifest);

        expect(setPlaybooksVersion).not.toHaveBeenCalled();
    });

    it('should handle empty version string', async () => {
        const manifest: ClientPluginManifest = {
            id: PLAYBOOKS_PLUGIN_ID,
            version: '',
            webapp: {
                bundle_path: '/static/playbooks.js',
            },
        };

        await handlePlaybookPluginEnabled(serverUrl, manifest);

        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '');
    });
});

describe('handlePlaybookPluginDisabled', () => {
    it('should clear playbooks version when plugin is disabled with correct manifest', async () => {
        const manifest: ClientPluginManifest = {
            id: PLAYBOOKS_PLUGIN_ID,
            version: '2.0.0',
            webapp: {
                bundle_path: '/static/playbooks.js',
            },
        };

        await handlePlaybookPluginDisabled(serverUrl, manifest);

        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '');
    });

    it('should not clear playbooks version when manifest id does not match playbooks plugin id', async () => {
        const manifest: ClientPluginManifest = {
            id: 'other-plugin',
            version: '1.0.0',
            webapp: {
                bundle_path: '/static/other.js',
            },
        };

        await handlePlaybookPluginDisabled(serverUrl, manifest);

        expect(setPlaybooksVersion).not.toHaveBeenCalled();
    });
});
