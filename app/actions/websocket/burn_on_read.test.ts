// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handleNewPostEvent, handlePostEdited} from '@actions/websocket/posts';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import TestHelper from '@test/test_helper';

import {handleBoRPostRevealedEvent} from './burn_on_read';

jest.mock('@actions/websocket/posts');
jest.mock('@queries/servers/post');

const serverUrl = 'burnOnRead.test.com';

describe('WebSocket Burn on Read Actions', () => {
    const post = TestHelper.fakePost({id: 'post1', channel_id: 'channel1', user_id: 'user1', create_at: 12345, message: 'hello'});

    const mockedGetPostById = jest.mocked(getPostById);
    const mockedHandleNewPostEvent = jest.mocked(handleNewPostEvent);
    const mockedHandlePostEdited = jest.mocked(handlePostEdited);

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

        it('should handle missing operator gracefully', async () => {
            await handleBoRPostRevealedEvent('invalid-server-url', msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(mockedHandleNewPostEvent).not.toHaveBeenCalled();
            expect(mockedHandlePostEdited).not.toHaveBeenCalled();
        });
    });
});
