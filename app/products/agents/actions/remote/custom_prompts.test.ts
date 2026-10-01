// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createPost} from '@actions/remote/post';
import {getCustomPromptsState, setCustomPromptsState} from '@agents/store/custom_prompts_store';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {fetchCustomPrompts, postCustomPrompt, renderCustomPrompt} from './custom_prompts';

import type {CustomPrompt} from '@agents/types/api';

jest.mock('@actions/remote/post');
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

    it('should return error and leave the store untouched when the prompts request fails', async () => {
        mockClient.getCustomPrompts.mockRejectedValue(new Error('network down'));
        mockClient.getCustomPromptPins.mockResolvedValue(['prompt-2']);

        const before = getCustomPromptsState(serverUrl);
        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(getCustomPromptsState(serverUrl)).toEqual(before);
    });

    it('should keep the fetched prompts and the previous pins when only the pins request fails', async () => {
        setCustomPromptsState(serverUrl, {prompts: [prompt], pinnedPromptIds: ['prompt-1']});
        const updated = {...prompt, name: 'Retro notes'};
        mockClient.getCustomPrompts.mockResolvedValue([updated]);
        mockClient.getCustomPromptPins.mockRejectedValue(new Error('network down'));

        const result = await fetchCustomPrompts(serverUrl);

        expect(result.error).toBeUndefined();
        expect(getCustomPromptsState(serverUrl)).toEqual({
            prompts: [updated],
            pinnedPromptIds: ['prompt-1'],
        });
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

describe('postCustomPrompt', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        await DatabaseManager.serverDatabases[serverUrl]!.operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'me'}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should post the rendered prompt as the current user and return the post id', async () => {
        mockClient.renderCustomPrompt.mockResolvedValue({rendered: 'Summarize my week'});
        jest.mocked(createPost).mockResolvedValue({data: true, post: {id: 'post-1'} as Post});

        const result = await postCustomPrompt(serverUrl, 'prompt-1', 'dm-1', 'ai-bot');

        expect(mockClient.renderCustomPrompt).toHaveBeenCalledWith('prompt-1', {channel_id: 'dm-1', bot_username: 'ai-bot'});
        expect(createPost).toHaveBeenCalledWith(serverUrl, {channel_id: 'dm-1', message: 'Summarize my week', user_id: 'me'});
        expect(result).toEqual({postId: 'post-1'});
    });

    it('should not post when the render fails', async () => {
        mockClient.renderCustomPrompt.mockRejectedValue(new Error('render failed'));

        const result = await postCustomPrompt(serverUrl, 'prompt-1', 'dm-1');

        expect(createPost).not.toHaveBeenCalled();
        expect(result.error).toBeDefined();
    });

    it('should report an error when the send failed and the post was kept locally for retry', async () => {
        mockClient.renderCustomPrompt.mockResolvedValue({rendered: 'Summarize my week'});
        jest.mocked(createPost).mockResolvedValue({data: true});

        const result = await postCustomPrompt(serverUrl, 'prompt-1', 'dm-1');

        expect(result.postId).toBeUndefined();
        expect(result.error).toBeDefined();
    });
});
