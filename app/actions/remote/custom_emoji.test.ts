// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchCustomEmojis, searchCustomEmojis, fetchCustomEmojiInBatchForTest} from './custom_emoji';

import type {Client} from '@client/rest';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');
jest.mock('@utils/errors');
jest.mock('@actions/remote/session');

const serverUrl = 'baseHandler.test.com';

const emojiId = 'emoji_id';
const emoji = {id: emojiId, name: 'emoji_name'};
const mockEmojis = [emoji];
const error = new Error('Test error');

beforeEach(async () => {
    jest.clearAllMocks();
    await DatabaseManager.init([serverUrl]);
});

describe('fetchCustomEmojis', () => {
    it('should fetch custom emojis successfully', async () => {
        const mockClient = {
            getCustomEmojis: jest.fn().mockResolvedValue(mockEmojis),
            getCustomEmojiImageUrl: jest.fn(),
        };
        jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

        const result = await fetchCustomEmojis(serverUrl);

        expect(result).toEqual({data: mockEmojis});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCustomEmojis).toHaveBeenCalled();
    });

    it('should handle error during fetch custom emojis', async () => {
        const mockClient = {
            getCustomEmojis: jest.fn().mockRejectedValue(error),
            getCustomEmojiImageUrl: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

        const result = await fetchCustomEmojis(serverUrl);

        expect(result).toEqual({error});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCustomEmojis).toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('error on fetchCustomEmojis', 'Full error message');
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });
});

describe('searchCustomEmojis', () => {
    it('should search custom emojis successfully', async () => {
        const term = 'emoji';
        const mockClient = {
            searchCustomEmoji: jest.fn().mockResolvedValue(mockEmojis),
            getCustomEmojiImageUrl: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await searchCustomEmojis(serverUrl, term);

        expect(result).toEqual({data: mockEmojis});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.searchCustomEmoji).toHaveBeenCalledWith(term);
    });

    it('should handle error during search custom emojis', async () => {
        const term = 'emoji';
        const mockClient = {
            searchCustomEmoji: jest.fn().mockRejectedValue(error),
            getCustomEmojiImageUrl: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        (getFullErrorMessage as jest.Mock).mockReturnValue('Full error message');

        const result = await searchCustomEmojis(serverUrl, term);

        expect(result).toEqual({error});
        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.searchCustomEmoji).toHaveBeenCalledWith(term);
        expect(logDebug).toHaveBeenCalledWith('error on searchCustomEmojis', 'Full error message');
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });
});

describe('fetchEmojisByName', () => {
    it('should fetch emojis by name successfully', async () => {
        const mockClient = {
            getCustomEmojiByName: jest.fn().mockResolvedValue(emoji),
            getCustomEmojiImageUrl: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        await fetchCustomEmojiInBatchForTest(serverUrl, emoji.name);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCustomEmojiByName).toHaveBeenCalledWith(emoji.name);
    });

    it('should handle no emojis', async () => {
        const mockClient = {
            getCustomEmojiByName: jest.fn().mockRejectedValue('error message'),
            getCustomEmojiImageUrl: jest.fn(),
        };
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        await fetchCustomEmojiInBatchForTest(serverUrl, emoji.name);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getCustomEmojiByName).toHaveBeenCalledWith(emoji.name);
    });

    it('should handle error during fetch emojis by name', async () => {
        (NetworkManager.getClient as jest.Mock).mockRejectedValue('error message');
        await fetchCustomEmojiInBatchForTest(serverUrl, emoji.name);

        expect(logDebug).toHaveBeenCalled();
    });
});
