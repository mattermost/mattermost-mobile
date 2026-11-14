// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const serverUrl = 'https://example.com';

import {General} from '@constants';
import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';

import {isNPSEnabled, giveFeedbackAction} from './nps';

import type {Client} from '@client/rest';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');

const mockClient = {
    getPluginsManifests: jest.fn(),
    npsGiveFeedbackAction: jest.fn(),
} as Partial<Client>;

describe('isNPSEnabled', () => {
    it(`should return true if there is at least one plugin with id equal to ${General.NPS_PLUGIN_ID}`, async () => {
        jest.mocked(NetworkManager.getClient).mockReturnValueOnce(mockClient as Client);
        jest.mocked(mockClient.getPluginsManifests)?.mockResolvedValueOnce([{
            id: General.NPS_PLUGIN_ID,
            version: '',
            webapp: {
                bundle_path: '',
            },
        }]);

        const result = await isNPSEnabled(serverUrl);

        expect(result).toBe(true);
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getPluginsManifests).toHaveBeenCalled();
    });

    it(`should return true if NPS plugin is enabled when at least one item has an id equal to ${General.NPS_PLUGIN_ID}`, async () => {
        jest.mocked(NetworkManager.getClient).mockReturnValueOnce(mockClient as Client);
        jest.mocked(mockClient.getPluginsManifests)?.mockResolvedValueOnce([{
            id: 'not a nps plugin id',
            version: '',
            webapp: {
                bundle_path: '',
            },
        }, {
            id: General.NPS_PLUGIN_ID,
            version: '',
            webapp: {
                bundle_path: '',
            },
        }]);

        const result = await isNPSEnabled(serverUrl);

        expect(result).toBe(true);
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getPluginsManifests).toHaveBeenCalled();
    });

    it('should return false with empty list of plugins', async () => {
        jest.mocked(NetworkManager.getClient).mockReturnValueOnce(mockClient as Client);
        jest.mocked(mockClient.getPluginsManifests)?.mockResolvedValueOnce([]);

        const result = await isNPSEnabled(serverUrl);

        expect(result).toBe(false);
    });

    it(`should return false if there is no plugin id equal to ${General.NPS_PLUGIN_ID}`, async () => {
        jest.mocked(NetworkManager.getClient).mockReturnValueOnce(mockClient as Client);
        jest.mocked(mockClient.getPluginsManifests)?.mockResolvedValueOnce([{
            id: 'not a nps plugin id',
            version: '',
            webapp: {
                bundle_path: '',
            },
        }]);

        const result = await isNPSEnabled(serverUrl);

        expect(result).toBe(false);
    });

    it('should return false on error and log debug message', async () => {
        jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await isNPSEnabled(serverUrl);

        expect(result).toBe(false);
        expect(logDebug).toHaveBeenCalledWith('error on isNPSEnabled', expect.any(String));
    });
});

describe('giveFeedbackAction', () => {
    const post: Post = {
        id: 'post_id',
        create_at: 0,
        update_at: 0,
        edit_at: 0,
        delete_at: 0,
        is_pinned: false,
        user_id: 'user_id',
        channel_id: 'channel_id',
        root_id: '',
        original_id: '',
        message: 'message',
        type: '',
        hashtags: '',
        pending_post_id: '',
        reply_count: 0,
        metadata: {},
        props: undefined,
    };

    it('should return post on success', async() => {
        jest.mocked(NetworkManager.getClient).mockReturnValueOnce(mockClient as Client);
        jest.mocked(mockClient.npsGiveFeedbackAction)?.mockResolvedValueOnce(post);

        const result = await giveFeedbackAction(serverUrl);

        expect(result).toHaveProperty('post');
    });

    it('should return error on failure and log debug message', async() => {
        jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await giveFeedbackAction(serverUrl);

        expect(result).toHaveProperty('error');
        expect(logDebug).toHaveBeenCalledWith('error on giveFeedbackAction', expect.any(String));
    });
});
