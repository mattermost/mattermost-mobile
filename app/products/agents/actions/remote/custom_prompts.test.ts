// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import customPromptsStore from '@agents/store/custom_prompts_store';
import NetworkManager from '@managers/network_manager';

import {fetchCustomPromptPins, fetchCustomPrompts, renderCustomPrompt} from './custom_prompts';

import type {CustomPrompt} from '@agents/types/api';

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

const serverUrl = 'https://test.mattermost.com';

const prompt: CustomPrompt = {
    id: 'prompt1',
    creator_id: 'user1',
    name: 'Daily standup',
    description: 'Summarize my standup notes',
    template: 'Summarize {{.ChannelName}}',
    is_shared: true,
    created_at: 1,
    updated_at: 1,
    deleted_at: 0,
};

const mockClient = {
    getCustomPrompts: jest.fn(),
    getCustomPromptPins: jest.fn(),
    renderCustomPrompt: jest.fn(),
};

beforeAll(() => {
    // @ts-expect-error mock minimal client
    NetworkManager.getClient = () => mockClient;
});

beforeEach(() => {
    jest.clearAllMocks();
    customPromptsStore.removeServer(serverUrl);
});

describe('fetchCustomPrompts', () => {
    it('should cache the fetched prompts in the ephemeral store', async () => {
        mockClient.getCustomPrompts.mockResolvedValue([prompt]);

        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([prompt]);
        expect(customPromptsStore.getPrompts(serverUrl)).toEqual([prompt]);
    });

    it('should coerce a null response body to an empty list', async () => {
        mockClient.getCustomPrompts.mockResolvedValue(null);

        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([]);
    });

    it('should return the error and leave the store untouched on failure', async () => {
        customPromptsStore.setPrompts(serverUrl, [prompt]);
        mockClient.getCustomPrompts.mockRejectedValue(new Error('boom'));

        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeDefined();
        expect(customPromptsStore.getPrompts(serverUrl)).toEqual([prompt]);
    });
});

describe('fetchCustomPromptPins', () => {
    it('should cache the fetched pinned ids in the ephemeral store', async () => {
        mockClient.getCustomPromptPins.mockResolvedValue(['prompt1']);

        const result = await fetchCustomPromptPins(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(['prompt1']);
        expect(customPromptsStore.getPinnedIds(serverUrl)).toEqual(['prompt1']);
    });

    it('should return the error on failure', async () => {
        mockClient.getCustomPromptPins.mockRejectedValue(new Error('boom'));

        const result = await fetchCustomPromptPins(serverUrl);

        expect(result.error).toBeDefined();
        expect(customPromptsStore.getPinnedIds(serverUrl)).toEqual([]);
    });
});

describe('renderCustomPrompt', () => {
    it('should pass channel and bot context and return the rendered text', async () => {
        mockClient.renderCustomPrompt.mockResolvedValue({rendered: 'Summarize Town Square'});

        const result = await renderCustomPrompt(serverUrl, 'prompt1', 'channel1', 'matty');

        expect(mockClient.renderCustomPrompt).toHaveBeenCalledWith('prompt1', 'channel1', 'matty');
        expect(result.error).toBeUndefined();
        expect(result.data).toBe('Summarize Town Square');
    });

    it('should return the error on failure', async () => {
        mockClient.renderCustomPrompt.mockRejectedValue(new Error('boom'));

        const result = await renderCustomPrompt(serverUrl, 'prompt1');

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
    });
});
