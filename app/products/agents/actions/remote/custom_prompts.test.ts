// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCustomPromptsState} from '@agents/store/custom_prompts_store';
import NetworkManager from '@managers/network_manager';

import {fetchCustomPrompts, renderCustomPrompt} from './custom_prompts';

import type {CustomPrompt} from '@agents/types/api';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';

const mockClient = {
    getCustomPrompts: jest.fn(),
    getCustomPromptPins: jest.fn(),
    renderCustomPrompt: jest.fn(),
};

const prompt: CustomPrompt = {
    id: 'prompt-1',
    creator_id: 'user-1',
    name: 'Standup update',
    description: 'Draft a standup update',
    template: 'Draft my standup update for {{.Channel}}',
    is_shared: true,
    created_at: 1,
    updated_at: 1,
    deleted_at: 0,
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchCustomPrompts', () => {
    it('should populate the store with prompts and pinned ids', async () => {
        mockClient.getCustomPrompts.mockResolvedValue([prompt]);
        mockClient.getCustomPromptPins.mockResolvedValue(['prompt-1']);

        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(getCustomPromptsState(serverUrl)).toEqual({
            prompts: [prompt],
            pinnedPromptIds: ['prompt-1'],
        });
    });

    it('should return error and leave the store untouched when the request fails', async () => {
        mockClient.getCustomPrompts.mockResolvedValue([]);
        mockClient.getCustomPromptPins.mockRejectedValue(new Error('network down'));

        const before = getCustomPromptsState(serverUrl);
        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(getCustomPromptsState(serverUrl)).toEqual(before);
    });
});

describe('renderCustomPrompt', () => {
    it('should return the rendered text and forward the context', async () => {
        mockClient.renderCustomPrompt.mockResolvedValue({rendered: 'Draft my standup update for Town Square'});

        const result = await renderCustomPrompt(serverUrl, 'prompt-1', {channel_id: 'channel-1', bot_username: 'ai-bot'});

        expect(mockClient.renderCustomPrompt).toHaveBeenCalledWith('prompt-1', {channel_id: 'channel-1', bot_username: 'ai-bot'});
        expect(result.error).toBeUndefined();
        expect(result.data).toBe('Draft my standup update for Town Square');
    });

    it('should return error when the render fails', async () => {
        mockClient.renderCustomPrompt.mockRejectedValue(new Error('render failed'));

        const result = await renderCustomPrompt(serverUrl, 'prompt-1', {});

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
    });
});
