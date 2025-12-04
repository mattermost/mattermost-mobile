// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryReaction} from '@queries/servers/reaction';

import {handleAddCustomEmoji, handleReactionAddedToPostEvent, handleReactionRemovedFromPostEvent} from './reactions';

jest.mock('@database/manager');
jest.mock('@queries/servers/reaction');

describe('WebSocket Reactions Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const postId = 'post-id';
    const userId = 'user-id';
    const emojiName = 'smile';

    let operator: any;
    let database: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        operator = {
            handleCustomEmojis: jest.fn(),
            handleReactions: jest.fn(),
        };

        database = {
            write: jest.fn((callback) => callback()),
        };

        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database,
            operator,
        });

        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('handleAddCustomEmoji', () => {
        it('should handle custom emoji addition', async () => {
            const emoji = {
                id: 'emoji-id',
                name: 'custom-emoji',
                creator_id: userId,
            };

            const msg = {
                data: {
                    emoji: JSON.stringify(emoji),
                },
            } as WebSocketMessage;

            await handleAddCustomEmoji(serverUrl, msg);

            expect(operator.handleCustomEmojis).toHaveBeenCalledWith({
                prepareRecordsOnly: false,
                emojis: [emoji],
            });
        });

        it('should handle invalid emoji data gracefully', async () => {
            const msg = {
                data: {
                    emoji: 'invalid-json',
                },
            } as WebSocketMessage;

            await handleAddCustomEmoji(serverUrl, msg);

            expect(operator.handleCustomEmojis).not.toHaveBeenCalled();
        });
    });

    describe('handleReactionAddedToPostEvent', () => {
        it('should handle reaction addition', async () => {
            const reaction = {
                user_id: userId,
                post_id: postId,
                emoji_name: emojiName,
                create_at: 123,
            };

            const msg = {
                data: {
                    reaction: JSON.stringify(reaction),
                },
            } as WebSocketMessage;

            await handleReactionAddedToPostEvent(serverUrl, msg);

            expect(operator.handleReactions).toHaveBeenCalledWith({
                prepareRecordsOnly: false,
                skipSync: true,
                postsReactions: [{
                    post_id: postId,
                    reactions: [reaction],
                }],
            });
        });

        it('should handle invalid reaction data gracefully', async () => {
            const msg = {
                data: {
                    reaction: 'invalid-json',
                },
            } as WebSocketMessage;

            await handleReactionAddedToPostEvent(serverUrl, msg);

            expect(operator.handleReactions).not.toHaveBeenCalled();
        });
    });

    describe('handleReactionRemovedFromPostEvent', () => {
        it('should handle reaction removal', async () => {
            const reaction = {
                user_id: userId,
                post_id: postId,
                emoji_name: emojiName,
            };

            const mockReactionModel = {
                destroyPermanently: jest.fn(),
            };

            jest.mocked(queryReaction).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([mockReactionModel]),
            } as any);

            const msg = {
                data: {
                    reaction: JSON.stringify(reaction),
                },
            } as WebSocketMessage;

            await handleReactionRemovedFromPostEvent(serverUrl, msg);

            expect(queryReaction).toHaveBeenCalledWith(database, emojiName, postId, userId);
            expect(mockReactionModel.destroyPermanently).toHaveBeenCalled();
            expect(database.write).toHaveBeenCalled();
        });

        it('should handle non-existent reaction gracefully', async () => {
            jest.mocked(queryReaction).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([]),
            } as any);

            const msg = {
                data: {
                    reaction: JSON.stringify({
                        user_id: userId,
                        post_id: postId,
                        emoji_name: emojiName,
                    }),
                },
            } as WebSocketMessage;

            await handleReactionRemovedFromPostEvent(serverUrl, msg);

            expect(database.write).not.toHaveBeenCalled();
        });

        it('should handle invalid reaction data gracefully', async () => {
            const msg = {
                data: {
                    reaction: 'invalid-json',
                },
            } as WebSocketMessage;

            await handleReactionRemovedFromPostEvent(serverUrl, msg);

            expect(queryReaction).not.toHaveBeenCalled();
            expect(database.write).not.toHaveBeenCalled();
        });
    });
});
