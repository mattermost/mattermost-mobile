// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePost} from '@actions/local/post';
import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
import {ActionType} from '@constants';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getCurrentUser} from '@queries/servers/user';
import TestHelper from '@test/test_helper';

import {handleBoRPostRevealedEvent, handleBoRPostBurnedEvent, handleBoRPostAllRevealed} from './burn_on_read';

import type {ServerDatabase} from '@typings/database/database';

jest.mock('@actions/websocket/posts');
jest.mock('@queries/servers/post');
jest.mock('@actions/local/post');
jest.mock('@queries/servers/user');

const serverUrl = 'burnOnRead.test.com';

describe('WebSocket Burn on Read Actions', () => {
    const post = TestHelper.fakePost({id: 'post1', channel_id: 'channel1', user_id: 'user1', create_at: 12345, message: 'hello'});

    const mockedGetPostById = jest.mocked(getPostById);
    const mockedHandleNewPostEvent = jest.mocked(handleNewPostEvent);
    const mockedHandlePostEdited = jest.mocked(handlePostEdited);
    const mockedRemovePost = jest.mocked(removePost);
    const mockedGetCurrentUser = jest.mocked(getCurrentUser);

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    });

    describe('handleBoRPostRevealedEvent', () => {
        const msg = {
            data: {
                post: JSON.stringify(post),
            },
        } as WebSocketMessage;

        it('should handle new post when post does not exist locally', async () => {
            mockedGetPostById.mockResolvedValue(undefined);

            await handleBoRPostRevealedEvent(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedHandleNewPostEvent).toHaveBeenCalledWith(serverUrl, msg);
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });

        it('should handle post edited when post exists locally', async () => {
            const existingPost = TestHelper.fakePostModel({id: 'post1'});
            mockedGetPostById.mockResolvedValue(existingPost);

            await handleBoRPostRevealedEvent(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedHandlePostEdited).toHaveBeenCalledWith(serverUrl, msg);
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
        });

        it('should handle malformed post data gracefully', async () => {
            const malformedMsg = {
                data: {
                    post: 'invalid json',
                },
            } as WebSocketMessage;

            await handleBoRPostRevealedEvent(serverUrl, malformedMsg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });

        it('should handle missing server database gracefully', async () => {
            await handleBoRPostRevealedEvent('invalid-server-url', msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });

        it('should handle missing operator gracefully', async () => {
            // Mock a server database without an operator
            DatabaseManager.serverDatabases[serverUrl] = {} as any;

            await handleBoRPostRevealedEvent(serverUrl, msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });

        it('should handle JSON parse error gracefully', async () => {
            const invalidJsonMsg = {
                data: {
                    post: '{"invalid": json}',
                },
            } as WebSocketMessage;

            const result = await handleBoRPostRevealedEvent(serverUrl, invalidJsonMsg);

            expect(result).toEqual({});
            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });
    });

    describe('handleBoRPostBurnedEvent', () => {
        const burnOnReadPost = TestHelper.fakePostModel({
            id: 'post1',
            type: PostTypes.BURN_ON_READ,
        });

        const regularPost = TestHelper.fakePostModel({
            id: 'post2',
            type: '',
        });

        const msg = {
            data: {
                post_id: 'post1',
            },
        } as WebSocketMessage;

        it('should remove burn-on-read post when it exists locally', async () => {
            mockedGetPostById.mockResolvedValue(burnOnReadPost);

            const result = await handleBoRPostBurnedEvent(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedRemovePost).toHaveBeenCalledWith(serverUrl, burnOnReadPost);
            expect(result).toEqual({});
        });

        it('should not remove post when post does not exist locally', async () => {
            mockedGetPostById.mockResolvedValue(undefined);

            const result = await handleBoRPostBurnedEvent(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedRemovePost).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should not remove post when post is not burn-on-read type', async () => {
            mockedGetPostById.mockResolvedValue(regularPost);

            const result = await handleBoRPostBurnedEvent(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedRemovePost).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle missing server database gracefully', async () => {
            const result = await handleBoRPostBurnedEvent('invalid-server-url', msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedRemovePost).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle missing operator gracefully', async () => {
            // Mock a server database without an operator
            DatabaseManager.serverDatabases[serverUrl] = {} as any;

            const result = await handleBoRPostBurnedEvent(serverUrl, msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedRemovePost).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle errors gracefully and return error object', async () => {
            mockedGetPostById.mockRejectedValue(new Error('Database error'));

            const result = await handleBoRPostBurnedEvent(serverUrl, msg);

            expect(result).toHaveProperty('error');
            expect(result!.error).toBeInstanceOf(Error);
            expect(mockedRemovePost).not.toHaveBeenCalled();
        });
    });

    describe('handleBoRPostAllRevealed', () => {
        const currentUser = TestHelper.fakeUserModel({id: 'user1'});
        const burnOnReadPost = TestHelper.fakePostModel({
            id: 'post1',
            type: PostTypes.BURN_ON_READ,
            userId: 'user1',
        });

        const msg = {
            data: {
                post_id: 'post1',
                sender_expire_at: 67890,
            },
        } as WebSocketMessage;

        beforeEach(() => {
            const mockOperator = {
                database: {},
                handlePosts: jest.fn().mockResolvedValue({}),
            };
            DatabaseManager.serverDatabases[serverUrl] = {operator: mockOperator} as unknown as ServerDatabase;
        });

        it('should update post with expire_at when user owns the burn-on-read post', async () => {
            const mockToApi = jest.fn().mockResolvedValue({
                id: 'post1',
                type: PostTypes.BURN_ON_READ,
                user_id: 'user1',
                metadata: {},
            });
            burnOnReadPost.toApi = mockToApi;

            mockedGetPostById.mockResolvedValue(burnOnReadPost);
            mockedGetCurrentUser.mockResolvedValue(currentUser);

            const result = await handleBoRPostAllRevealed(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedGetCurrentUser).toHaveBeenCalledWith(expect.any(Object));
            expect(mockToApi).toHaveBeenCalled();
            expect(DatabaseManager.serverDatabases[serverUrl]?.operator?.handlePosts).toHaveBeenCalledWith({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: ['post1'],
                posts: [{
                    id: 'post1',
                    type: PostTypes.BURN_ON_READ,
                    user_id: 'user1',
                    metadata: {expire_at: 67890},
                }],
                prepareRecordsOnly: false,
            });
            expect(result).toHaveProperty('post');
            expect(result!.post!.metadata.expire_at).toBe(67890);
        });

        it('should return null when post does not exist locally', async () => {
            mockedGetPostById.mockResolvedValue(undefined);

            const result = await handleBoRPostAllRevealed(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedGetCurrentUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should return null when user does not own the post', async () => {
            const otherUsersBoRPost = TestHelper.fakePostModel({
                id: 'post1',
                type: PostTypes.BURN_ON_READ,
                userId: 'otheruser1',
            });
            mockedGetPostById.mockResolvedValue(otherUsersBoRPost);
            mockedGetCurrentUser.mockResolvedValue(currentUser);

            const result = await handleBoRPostAllRevealed(serverUrl, msg);

            expect(mockedGetPostById).toHaveBeenCalledWith(expect.any(Object), 'post1');
            expect(mockedGetCurrentUser).toHaveBeenCalledWith(expect.any(Object));
            expect(DatabaseManager.serverDatabases[serverUrl]?.operator?.handlePosts).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle missing server database gracefully', async () => {
            const result = await handleBoRPostAllRevealed('invalid-server-url', msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedGetCurrentUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle missing operator gracefully', async () => {
            DatabaseManager.serverDatabases[serverUrl] = {} as any;

            const result = await handleBoRPostAllRevealed(serverUrl, msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedGetCurrentUser).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should handle errors gracefully and return error object', async () => {
            mockedGetPostById.mockRejectedValue(new Error('Database error'));

            const result = await handleBoRPostAllRevealed(serverUrl, msg);

            expect(result).toHaveProperty('error');
            expect(result!.error).toBeInstanceOf(Error);
            expect(mockedGetCurrentUser).not.toHaveBeenCalled();
        });
    });
});
