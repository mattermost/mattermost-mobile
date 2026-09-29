// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {readChannel} from '@agents/local/tools/read_channel';
import {getChannelById} from '@queries/servers/channel';
import {getRecentPostsInChannel} from '@queries/servers/post';
import {queryUsersById} from '@queries/servers/user';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(),
}));

jest.mock('@queries/servers/post', () => ({
    getRecentPostsInChannel: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    queryUsersById: jest.fn(),
}));

jest.mock('@utils/post', () => ({
    isSystemMessage: jest.fn((post: {type?: string}) => Boolean(post.type?.startsWith('system_'))),
}));

describe('readChannel', () => {
    const database = {} as Database;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(queryUsersById).mockReturnValue({
            fetch: jest.fn(async () => [
                {id: 'u1', username: 'alice'},
                {id: 'u2', username: 'bob'},
            ]),
        } as never);
    });

    it('should return an error when channel_id is missing', async () => {
        const result = await readChannel(database, {});
        expect(result.forToolStep).toContain('channel_id is required');
    });

    it('should compact posts for the answer step and stub them for the tool step', async () => {
        jest.mocked(getChannelById).mockResolvedValue({
            id: 'channel-1',
            displayName: 'Town Square',
        } as never);

        // Newest first, matching queryPostsChunk(sortBy create_at desc).
        jest.mocked(getRecentPostsInChannel).mockResolvedValue([
            {
                id: 'p2',
                userId: 'u2',
                message: 'Second post',
                createAt: Date.parse('2026-09-28T13:15:00Z'),
                deleteAt: 0,
                type: '',
            },
            {
                id: 'p1',
                userId: 'u1',
                message: 'Hello from town square',
                createAt: Date.parse('2026-09-28T13:14:00Z'),
                deleteAt: 0,
                type: '',
            },
        ] as never);

        const result = await readChannel(database, {channel_id: 'channel-1'});

        expect(result.forToolStep).toBe('2 posts loaded from Town Square.');
        expect(result.forAnswer).toContain('Channel Town Square');
        expect(result.forAnswer).toContain('@alice: Hello from town square');
        expect(result.forAnswer).toContain('@bob: Second post');
        expect(result.forAnswer.indexOf('@alice')).toBeLessThan(result.forAnswer.indexOf('@bob'));
    });

    it('should ignore system messages', async () => {
        jest.mocked(getChannelById).mockResolvedValue({
            id: 'channel-1',
            displayName: 'Town Square',
        } as never);
        jest.mocked(getRecentPostsInChannel).mockResolvedValue([
            {
                id: 'p1',
                userId: 'u1',
                message: 'joined the channel',
                createAt: Date.now(),
                deleteAt: 0,
                type: 'system_join_channel',
            },
        ] as never);

        const result = await readChannel(database, {channel_id: 'channel-1'});
        expect(result.forToolStep).toBe('0 posts loaded from Town Square.');
        expect(result.forAnswer).toContain('No cached posts available');
    });
});
