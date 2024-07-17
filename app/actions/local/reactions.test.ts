// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import DatabaseManager from '@database/manager';
import * as recentReactionsQueries from '@queries/servers/system';
import * as emojiHelpers from '@utils/emoji/helpers';
import * as logUtils from '@utils/log';

import {addRecentReaction} from './reactions';

import type ServerDataOperator from '@app/database/operator/server_data_operator';

jest.mock('@database/manager');
jest.mock('@queries/servers/system');
jest.mock('@utils/emoji/helpers');
jest.mock('@utils/log');

describe('addRecentReaction', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;

        (recentReactionsQueries.getRecentReactions as jest.Mock).mockResolvedValue([]);
        (emojiHelpers.getEmojiFirstAlias as jest.Mock).mockImplementation((emoji) => emoji);

        operator.handleSystem = jest.fn();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return an empty array if emojiNames is empty', async () => {
        const result = await addRecentReaction(serverUrl, []);
        expect(result).toEqual([]);
    });

    it('should add new emoji to the beginning of the list', async () => {
        (recentReactionsQueries.getRecentReactions as jest.Mock).mockResolvedValue([':water:']);
        const emojiNames = [':air:', ':fire:'];
        await addRecentReaction(serverUrl, emojiNames);

        expect(operator.handleSystem).toHaveBeenCalledWith({
            systems: [{
                id: 'recentReactions',
                value: JSON.stringify([':fire:', ':air:', ':water:']),
            }],
            prepareRecordsOnly: false,
        });
    });

    it('should move existing emoji to the beginning of the list', async () => {
        (recentReactionsQueries.getRecentReactions as jest.Mock).mockResolvedValue([':water:', ':fire:']);
        const emojiNames = [':air:', ':fire:'];
        await addRecentReaction(serverUrl, emojiNames);

        expect(operator.handleSystem).toHaveBeenCalledWith({
            systems: [{
                id: 'recentReactions',
                value: JSON.stringify([':fire:', ':air:', ':water:']),
            }],
            prepareRecordsOnly: false,
        });
    });

    it('should limit the list to MAXIMUM_RECENT_EMOJI', async () => {
        const longEmojiList = Array.from({length: 40}, (_, i) => `emoji${i}`);
        (recentReactionsQueries.getRecentReactions as jest.Mock).mockResolvedValue(longEmojiList);
        await addRecentReaction(serverUrl, ['newEmoji']);

        const handleSystemCall = (operator.handleSystem as jest.Mock).mock.calls[0][0];
        const savedEmojis = JSON.parse(handleSystemCall.systems[0].value);
        expect(savedEmojis.length).toBe(27);
        expect(savedEmojis[0]).toBe('newEmoji');
    });

    it('should use getEmojiFirstAlias for each emoji', async () => {
        (emojiHelpers.getEmojiFirstAlias as jest.Mock).mockImplementation((emoji) => {
            if (emoji === ':air:') {
                return ':wind:';
            }
            if (emoji === ':fire:') {
                return ':flame:';
            }
            return emoji;
        });

        const emojiNames = [':air:', ':fire:'];
        await addRecentReaction(serverUrl, emojiNames);

        expect(emojiHelpers.getEmojiFirstAlias).toHaveBeenCalledTimes(2);
        expect(emojiHelpers.getEmojiFirstAlias).toHaveBeenCalledWith(':air:');
        expect(emojiHelpers.getEmojiFirstAlias).toHaveBeenCalledWith(':fire:');
        expect(operator.handleSystem).toHaveBeenCalledWith({
            systems: [{
                id: 'recentReactions',
                value: JSON.stringify([':flame:', ':wind:']),
            }],
            prepareRecordsOnly: false,
        });
    });

    it('should handle errors and log them', async () => {
        const unregisteredServerUrl = 'unregistered.test.com';
        const failedError = new Error(`${unregisteredServerUrl} database not found`);

        const result = await addRecentReaction(unregisteredServerUrl, [':air:']);

        expect(logUtils.logError).toHaveBeenCalledWith('Failed addRecentReaction', failedError);
        expect(result).toEqual({error: failedError});
    });

    it('should handle prepareRecordsOnly=true flag', async () => {
        const emojiNames = [':air:'];
        await addRecentReaction(serverUrl, emojiNames, true);

        expect(operator.handleSystem).toHaveBeenCalledWith({
            systems: [{
                id: 'recentReactions',
                value: JSON.stringify([':air:']),
            }],
            prepareRecordsOnly: true,
        });
    });
});
