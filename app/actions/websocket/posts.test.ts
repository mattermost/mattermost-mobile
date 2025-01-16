// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {markChannelAsViewed, markChannelAsUnread, storeMyChannelsForTeam, updateLastPostAt} from '@actions/local/channel';
import {addPostAcknowledgement, markPostAsDeleted, removePostAcknowledgement} from '@actions/local/post';
import {updateThread} from '@actions/local/thread';
import {fetchChannelStats, fetchMyChannel, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchPostAuthors} from '@actions/remote/post';
import {fetchThread} from '@actions/remote/thread';
import {fetchMissingProfilesByIds} from '@actions/remote/user';
import {Events, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {PostsInChannelModel} from '@database/models/server';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getCurrentUserId, getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import {isTablet} from '@utils/helpers';
import {shouldIgnorePost} from '@utils/post';

import {handleNewPostEvent, handlePostEdited, handlePostDeleted, handlePostUnread, handlePostAcknowledgementAdded, handlePostAcknowledgementRemoved} from './posts';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';

jest.mock('@queries/servers/post');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/thread');
jest.mock('@actions/local/channel');
jest.mock('@actions/local/post');
jest.mock('@actions/local/thread');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/thread');
jest.mock('@actions/remote/user');
jest.mock('@utils/helpers');
jest.mock('@utils/post', () => ({
    ...jest.requireActual('@utils/post'),
    shouldIgnorePost: jest.fn(),
}));

const serverUrl = 'baseHandler.test.com';

describe('WebSocket Post Actions', () => {
    let operator: ServerDataOperator;

    const post = {id: 'post1', channel_id: 'channel1', user_id: 'user1', create_at: 12345, message: 'hello'} as Post;
    const postModels = [{channelId: post.channel_id, userId: post.user_id, message: post.message} as PostModel];
    const myChannelModel = {id: 'channel1', manuallyUnread: false, messageCount: 4, mentionsCount: 0, lastViewedAt: 1} as MyChannelModel;

    const mockedGetPostById = jest.mocked(getPostById);
    const mockedUpdateLastPostAt = jest.mocked(updateLastPostAt);
    const mockedMarkChannelAsViewed = jest.mocked(markChannelAsViewed);
    const mockedGetCurrentUserId = jest.mocked(getCurrentUserId);
    const mockedGetCurrentChannelId = jest.mocked(getCurrentChannelId);
    const mockedFetchPostAuthors = jest.mocked(fetchPostAuthors);
    const mockedIsTablet = jest.mocked(isTablet);
    const mockedGetMyChannel = jest.mocked(getMyChannel);
    const mockedGetIsCRTEnabled = jest.mocked(getIsCRTEnabled);
    const mockedShouldIgnorePost = jest.mocked(shouldIgnorePost);
    const mockedFetchMyChannel = jest.mocked(fetchMyChannel);
    const mockedStoreMyChannelsForTeam = jest.mocked(storeMyChannelsForTeam);
    const mockedFetchChannelStats = jest.mocked(fetchChannelStats);
    const mockedGetChannelById = jest.mocked(getChannelById);
    const mockedMarkPostAsDeleted = jest.mocked(markPostAsDeleted);
    const mockedUpdateThread = jest.mocked(updateThread);
    const mockedFetchThread = jest.mocked(fetchThread);
    const mockedMarkChannelAsUnread = jest.mocked(markChannelAsUnread);
    const mockedAddPostAcknowledgement = jest.mocked(addPostAcknowledgement);
    const mockedFetchMissingProfilesByIds = jest.mocked(fetchMissingProfilesByIds);
    const mockedRemovePostAcknowledgement = jest.mocked(removePostAcknowledgement);

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        jest.clearAllMocks();
    });

    describe('handleNewPostEvent', () => {
        const msg = {
            data: {
                post: JSON.stringify(post),
                mentions: ['user1'],
            },
        } as WebSocketMessage;

        const mockedGetScreensInStack = jest.spyOn(NavigationStore, 'getScreensInStack');

        mockedGetPostById.mockResolvedValue(undefined);
        mockedUpdateLastPostAt.mockResolvedValue({member: myChannelModel});
        mockedMarkChannelAsViewed.mockResolvedValue({member: myChannelModel});
        mockedGetCurrentUserId.mockResolvedValue('user1');
        mockedGetCurrentChannelId.mockResolvedValue('channel1');
        mockedFetchPostAuthors.mockResolvedValue({authors: []});
        mockedGetScreensInStack.mockReturnValue([Screens.CHANNEL]);
        mockedIsTablet.mockReturnValue(false);

        it('should handle new post event - channel membership present', async () => {
            const userModel = {id: 'user1', username: 'username1'} as UserModel;
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());
            jest.spyOn(operator, 'handlePosts').mockResolvedValue(postModels);
            jest.spyOn(operator, 'handleUsers').mockResolvedValue([userModel]);

            mockedFetchPostAuthors.mockResolvedValueOnce({authors: [{id: 'user1', username: 'username1'} as UserProfile]});
            mockedGetMyChannel.mockResolvedValue(myChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(false);
            mockedShouldIgnorePost.mockReturnValue(false);

            await handleNewPostEvent(serverUrl, msg);

            expect(emitSpy).toHaveBeenCalledWith(Events.USER_STOP_TYPING, {
                channelId: 'channel1',
                rootId: undefined,
                userId: 'user1',
                now: expect.any(Number),
            });

            expect(batchRecordsSpy).toHaveBeenCalledWith([userModel, {_preparedState: null, id: 'channel1', lastViewedAt: 1, manuallyUnread: false, mentionsCount: 0, messageCount: 4}, postModels[0]], 'handleNewPostEvent');
        });

        it('should handle new post event - without channel membership present', async () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());
            jest.spyOn(operator, 'handlePosts').mockResolvedValue(postModels);

            mockedGetMyChannel.mockResolvedValueOnce(undefined);
            mockedFetchMyChannel.mockResolvedValue({teamId: 'team1', memberships: [{user_id: 'user1', channel_id: 'channel1'}]} as MyChannelsRequest);
            mockedStoreMyChannelsForTeam.mockResolvedValue({models: [myChannelModel], error: undefined});
            mockedGetMyChannel.mockResolvedValueOnce(myChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(false);
            mockedShouldIgnorePost.mockReturnValue(true);

            await handleNewPostEvent(serverUrl, msg);

            expect(emitSpy).toHaveBeenCalledWith(Events.USER_STOP_TYPING, {
                channelId: 'channel1',
                rootId: undefined,
                userId: 'user1',
                now: expect.any(Number),
            });

            expect(batchRecordsSpy).toHaveBeenCalledWith(postModels, 'handleNewPostEvent');
        });

        it('should handle new post event - CRT enabled, manually unread', async () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());
            jest.spyOn(operator, 'handlePosts').mockResolvedValue(postModels);

            mockedGetMyChannel.mockResolvedValue({...myChannelModel, manuallyUnread: true} as MyChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedShouldIgnorePost.mockReturnValue(false);
            mockedMarkChannelAsUnread.mockResolvedValue({member: myChannelModel});

            await handleNewPostEvent(serverUrl, msg);

            expect(emitSpy).toHaveBeenCalledWith(Events.USER_STOP_TYPING, {
                channelId: 'channel1',
                rootId: undefined,
                userId: 'user1',
                now: expect.any(Number),
            });

            expect(batchRecordsSpy).toHaveBeenCalledWith([{_preparedState: null, id: 'channel1', lastViewedAt: 1, manuallyUnread: false, mentionsCount: 0, messageCount: 4}, postModels[0]], 'handleNewPostEvent');
        });

        it('should handle new post event - out of order ws, CRT on, root id', async () => {
            const newPost = {...post, root_id: 'post2'} as Post;
            jest.spyOn(EphemeralStore, 'getLastPostWebsocketEvent').mockReturnValueOnce({deleted: true, post: newPost});
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');
            jest.spyOn(operator, 'handlePosts').mockResolvedValue(postModels);

            mockedGetMyChannel.mockResolvedValue(myChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedShouldIgnorePost.mockReturnValue(false);

            await handleNewPostEvent(serverUrl, {data: {post: JSON.stringify(newPost), mentions: []}} as WebSocketMessage);

            expect(emitSpy).toHaveBeenCalledWith(Events.USER_STOP_TYPING, {
                channelId: 'channel1',
                rootId: 'post2',
                userId: 'user1',
                now: expect.any(Number),
            });

            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });

        it('should handle new post event - from webhook and is tablet', async () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());
            jest.spyOn(operator, 'handlePosts').mockResolvedValue(postModels);

            mockedGetMyChannel.mockResolvedValue(myChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(false);
            mockedShouldIgnorePost.mockReturnValue(false);
            mockedIsTablet.mockReturnValueOnce(true);
            mockedGetScreensInStack.mockReturnValue([]);

            await handleNewPostEvent(serverUrl, {data: {post: JSON.stringify({...post, props: {from_webhook: 'true'}}), mentions: []}} as WebSocketMessage);

            expect(mockedGetScreensInStack).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(Events.USER_STOP_TYPING, {
                channelId: 'channel1',
                rootId: undefined,
                userId: 'user1',
                now: expect.any(Number),
            });

            expect(batchRecordsSpy).toHaveBeenCalledWith([{_preparedState: null, id: 'channel1', lastViewedAt: 1, manuallyUnread: false, mentionsCount: 0, messageCount: 4}, postModels[0]], 'handleNewPostEvent');
        });

        it('should handle new post event - no operator', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            await handleNewPostEvent('junk', msg);

            expect(mockedGetCurrentUserId).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });

        it('should handle new post event - existing post', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            mockedGetPostById.mockResolvedValueOnce(postModels[0]);

            await handleNewPostEvent(serverUrl, msg);

            expect(mockedGetIsCRTEnabled).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });

        it('should handle new post event - malformed post data', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            mockedGetPostById.mockResolvedValueOnce(postModels[0]);

            await handleNewPostEvent(serverUrl, {data: undefined} as WebSocketMessage);

            expect(mockedGetCurrentUserId).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handlePostEdited', () => {
        const msg = {
            data: {
                post: JSON.stringify({id: 'post1', channel_id: 'channel1', user_id: 'user1', is_pinned: false}),
            },
        } as WebSocketMessage;

        it('should handle post edited event', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());

            mockedGetPostById.mockResolvedValue(postModels[0]);
            mockedFetchPostAuthors.mockResolvedValue({authors: []});
            mockedGetIsCRTEnabled.mockResolvedValue(false);

            await handlePostEdited(serverUrl, msg);

            expect(mockedFetchChannelStats).toHaveBeenCalledWith(serverUrl, 'channel1');
            expect(batchRecordsSpy).toHaveBeenCalledWith([expect.any(PostsInChannelModel)], 'handlePostEdited');
        });

        it('should handle post edited event - no operator', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            await handlePostEdited('junk', msg);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });

        it('should handle post edited event - malformed post data', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            mockedGetPostById.mockResolvedValueOnce(postModels[0]);

            await handlePostEdited(serverUrl, {data: undefined} as WebSocketMessage);

            expect(mockedGetPostById).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handlePostDeleted', () => {
        const deletedPost = {id: 'post1', channel_id: 'channel1', user_id: 'user1', root_id: 'root1', reply_count: 1};
        const msg = {
            data: {
                post: JSON.stringify(deletedPost),
            },
        } as WebSocketMessage;

        const threadModel = {viewedAt: 1, id: 'thread1'} as ThreadModel;

        it('should handle post deleted event', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());

            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedGetPostById.mockResolvedValue(postModels[0]);
            mockedMarkPostAsDeleted.mockResolvedValue({model: postModels[0]});
            mockedUpdateThread.mockResolvedValue({model: threadModel});
            mockedGetChannelById.mockResolvedValue({id: 'channel1', teamId: 'team1'} as ChannelModel);

            await handlePostDeleted(serverUrl, msg);

            expect(mockedMarkPostAsDeleted).toHaveBeenCalledWith(serverUrl, expect.any(Object), true);
            expect(mockedUpdateThread).toHaveBeenCalledWith(serverUrl, 'root1', {reply_count: 0}, true);
            expect(mockedFetchThread).toHaveBeenCalledWith(serverUrl, 'team1', 'root1');

            expect(batchRecordsSpy).toHaveBeenCalledWith([postModels[0], threadModel], 'handlePostDeleted');
        });

        it('should handle post deleted event - missing thread and channel', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());

            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedGetPostById.mockResolvedValue(postModels[0]);
            mockedMarkPostAsDeleted.mockResolvedValue({model: postModels[0]});
            mockedUpdateThread.mockResolvedValue({error: 'not found'});
            mockedGetChannelById.mockResolvedValue(undefined);

            await handlePostDeleted(serverUrl, msg);

            expect(mockedMarkPostAsDeleted).toHaveBeenCalledWith(serverUrl, expect.any(Object), true);
            expect(mockedUpdateThread).toHaveBeenCalledWith(serverUrl, 'root1', {reply_count: 0}, true);
            expect(mockedFetchThread).not.toHaveBeenCalled();

            expect(batchRecordsSpy).toHaveBeenCalledWith(postModels, 'handlePostDeleted');
        });

        it('should handle post deleted event - missing delete model and no root id', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords').mockImplementation(jest.fn());

            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedGetPostById.mockResolvedValue(postModels[0]);
            mockedMarkPostAsDeleted.mockResolvedValue({error: 'not found'});

            await handlePostDeleted(serverUrl, {data: {post: JSON.stringify({...deletedPost, root_id: ''})}} as WebSocketMessage);

            expect(mockedMarkPostAsDeleted).toHaveBeenCalledWith(serverUrl, expect.any(Object), true);
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handlePostUnread', () => {
        const msg = {
            broadcast: {
                channel_id: 'channel1',
                team_id: 'team1',
            },
            data: {
                mention_count: 1,
                mention_count_root: 1,
                msg_count: 1,
                msg_count_root: 1,
                last_viewed_at: 12345,
            },
        } as WebSocketMessage;

        it('should handle post unread event', async () => {
            mockedGetMyChannel.mockResolvedValue(myChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(false);
            mockedFetchMyChannel.mockResolvedValue({teamId: 'team1', memberships: [{user_id: 'user1', channel_id: 'channel1'}]} as MyChannelsRequest);
            mockedMarkChannelAsUnread.mockResolvedValue({member: myChannelModel});

            await handlePostUnread(serverUrl, msg);

            expect(mockedMarkChannelAsUnread).toHaveBeenCalledWith(serverUrl, 'channel1', 1, 1, 12345);
        });

        it('should handle post unread event - CRT enabled, manually marked read', async () => {
            mockedGetMyChannel.mockResolvedValue({...myChannelModel, manuallyUnread: true} as MyChannelModel);
            mockedGetIsCRTEnabled.mockResolvedValue(true);
            mockedFetchMyChannel.mockResolvedValue({teamId: 'team1', memberships: [{user_id: 'user1', channel_id: 'channel1'}]} as MyChannelsRequest);
            mockedMarkChannelAsUnread.mockResolvedValue({member: myChannelModel});

            await handlePostUnread(serverUrl, msg);

            expect(mockedMarkChannelAsUnread).not.toHaveBeenCalled();
        });

        it('should handle post unread event - no database', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            await handlePostUnread('junk', msg);

            expect(mockedGetMyChannel).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handlePostAcknowledgementAdded', () => {
        const msg = {
            data: {
                acknowledgement: JSON.stringify({user_id: 'user1', post_id: 'post1', acknowledged_at: 12345}),
            },
        } as WebSocketMessage;

        mockedGetCurrentUserId.mockResolvedValue('user1');

        it('should handle post acknowledgement added event', async () => {
            jest.spyOn(EphemeralStore, 'isAcknowledgingPost').mockReturnValue(false);

            await handlePostAcknowledgementAdded(serverUrl, msg);

            expect(mockedAddPostAcknowledgement).toHaveBeenCalledWith(serverUrl, 'post1', 'user1', 12345);
            expect(mockedFetchMissingProfilesByIds).toHaveBeenCalledWith(serverUrl, ['user1']);
        });

        it('should handle post acknowledgement added event - already acknowledging', async () => {
            jest.spyOn(EphemeralStore, 'isAcknowledgingPost').mockReturnValue(true);

            await handlePostAcknowledgementAdded(serverUrl, msg);

            expect(mockedAddPostAcknowledgement).not.toHaveBeenCalled();
        });

        it('should handle post acknowledgement added event - no database', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            await handlePostAcknowledgementAdded('junk', msg);

            expect(mockedGetCurrentUserId).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handlePostAcknowledgementRemoved', () => {
        const msg = {
            data: {
                acknowledgement: JSON.stringify({user_id: 'user1', post_id: 'post1'}),
            },
        } as WebSocketMessage;

        mockedGetCurrentUserId.mockResolvedValue('user1');

        it('should handle post acknowledgement removed event', async () => {
            jest.spyOn(EphemeralStore, 'isUnacknowledgingPost').mockReturnValue(false);

            await handlePostAcknowledgementRemoved(serverUrl, msg);

            expect(mockedRemovePostAcknowledgement).toHaveBeenCalledWith(serverUrl, 'post1', 'user1');
        });

        it('should handle post acknowledgement added event - already unacknowledging', async () => {
            jest.spyOn(EphemeralStore, 'isUnacknowledgingPost').mockReturnValue(true);

            await handlePostAcknowledgementRemoved(serverUrl, msg);

            expect(mockedRemovePostAcknowledgement).not.toHaveBeenCalled();
        });

        it('should handle post acknowledgement removed event - no database', async () => {
            const batchRecordsSpy = jest.spyOn(operator, 'batchRecords');

            await handlePostAcknowledgementRemoved('junk', msg);

            expect(mockedGetCurrentUserId).not.toHaveBeenCalled();
            expect(batchRecordsSpy).not.toHaveBeenCalled();
        });
    });
});
