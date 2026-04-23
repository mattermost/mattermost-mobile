// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';
import {enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {subscribeMentionsByServer, subscribeServerUnreadAndMentions, subscribeUnreadAndMentionsByServer, getTotalMentionsForServer} from './unreads';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('subscribeMentionsByServer', () => {
    const serverUrl = 'test-server';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        enableFakeTimers();
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        disableFakeTimers();
    });

    it('should exclude muted channels from mentions count', async () => {
        const channels: Channel[] = [
            TestHelper.fakeChannel({
                id: 'muted-channel-test',
                name: 'muted-channel',
                display_name: 'Muted Channel',
                type: 'O',
                delete_at: 0,
                team_id: 'team1',
            }),
            TestHelper.fakeChannel({
                id: 'non-muted-channel-test',
                name: 'non-muted-channel',
                display_name: 'Non Muted Channel',
                type: 'O',
                delete_at: 0,
                team_id: 'team1',
            }),
        ];

        const myChannels: ChannelMembership[] = [
            {
                id: 'muted-channel-test',
                user_id: 'user1',
                channel_id: 'muted-channel-test',
                last_post_at: Date.now(),
                last_viewed_at: Date.now(),
                last_update_at: Date.now(),
                mention_count: 5,
                msg_count: 10,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'default',
                    ignore_channel_mentions: 'default',
                },
            },
            {
                id: 'non-muted-channel-test',
                user_id: 'user1',
                channel_id: 'non-muted-channel-test',
                last_post_at: Date.now(),
                last_viewed_at: Date.now(),
                last_update_at: Date.now(),
                mention_count: 3,
                msg_count: 15,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'all',
                    push: 'default',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        await operator.handleChannel({channels, prepareRecordsOnly: false});
        await operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});

        return new Promise<void>((resolve, reject) => {
            const subscription = subscribeMentionsByServer(serverUrl, (url, {myChannels: filteredChannels, threadMentionCount}) => {
                try {
                    expect(url).toBe(serverUrl);
                    expect(filteredChannels).toBeDefined();
                    expect(Array.isArray(filteredChannels)).toBe(true);

                    const nonMutedChannel = filteredChannels.find((ch) => ch.id === 'non-muted-channel-test');
                    const mutedChannel = filteredChannels.find((ch) => ch.id === 'muted-channel-test');
                    expect(mutedChannel).toBeUndefined();
                    if (nonMutedChannel) {
                        expect(nonMutedChannel.mentionsCount).toBe(3);
                    }
                    expect(threadMentionCount).toBe(0);
                    subscription?.unsubscribe();
                    resolve();
                } catch (error) {
                    subscription?.unsubscribe();
                    reject(error);
                }
            });

            setTimeout(() => {
                subscription?.unsubscribe();
                reject(new Error('Subscription did not emit data within timeout'));
            }, 1000);
        });
    });

    it('should exclude all channels when all are muted', async () => {
        const channels: Channel[] = [
            TestHelper.fakeChannel({
                id: 'muted-channel-1',
                name: 'muted-channel-1',
                display_name: 'Muted Channel 1',
                type: 'O',
                delete_at: 0,
                team_id: 'team1',
            }),
            TestHelper.fakeChannel({
                id: 'muted-channel-2',
                name: 'muted-channel-2',
                display_name: 'Muted Channel 2',
                type: 'O',
                delete_at: 0,
                team_id: 'team1',
            }),
        ];

        const myChannels: ChannelMembership[] = [
            {
                id: 'muted-channel-1',
                user_id: 'user1',
                channel_id: 'muted-channel-1',
                last_post_at: Date.now(),
                last_viewed_at: Date.now(),
                last_update_at: Date.now(),
                mention_count: 7,
                msg_count: 10,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'default',
                    ignore_channel_mentions: 'default',
                },
            },
            {
                id: 'muted-channel-2',
                user_id: 'user1',
                channel_id: 'muted-channel-2',
                last_post_at: Date.now(),
                last_viewed_at: Date.now(),
                last_update_at: Date.now(),
                mention_count: 4,
                msg_count: 15,
                roles: 'user',
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    mark_unread: 'mention',
                    push: 'default',
                    ignore_channel_mentions: 'default',
                },
            },
        ];

        await operator.handleChannel({channels, prepareRecordsOnly: false});
        await operator.handleMyChannel({channels, myChannels, prepareRecordsOnly: false});

        return new Promise<void>((resolve, reject) => {
            const subscription = subscribeMentionsByServer(serverUrl, (url, {myChannels: filteredChannels}) => {
                try {
                    const testChannel1 = filteredChannels.find((ch) => ch.id === 'muted-channel-1');
                    const testChannel2 = filteredChannels.find((ch) => ch.id === 'muted-channel-2');

                    expect(testChannel1).toBeUndefined();
                    expect(testChannel2).toBeUndefined();

                    subscription?.unsubscribe();
                    resolve();
                } catch (error) {
                    subscription?.unsubscribe();
                    reject(error);
                }
            });

            setTimeout(() => {
                subscription?.unsubscribe();
                reject(new Error('Subscription did not emit data within timeout'));
            }, 1000);
        });
    });
});

describe('subscribeServerUnreadAndMentions', () => {
    const serverUrl = 'test-server-unread';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return undefined when server does not exist', () => {
        const sub = subscribeServerUnreadAndMentions('http://nonexistent.com', jest.fn());
        expect(sub).toBeUndefined();
    });

    it('should return a subscription and emit data for the existing server', async () => {
        const observer = jest.fn();
        const sub = subscribeServerUnreadAndMentions(serverUrl, observer);

        expect(sub).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(observer).toHaveBeenCalled();
        const args = observer.mock.calls[0][0];
        expect(args).toHaveProperty('myChannels');
        expect(args).toHaveProperty('threadMentionCount');

        sub?.unsubscribe();
    });
});

describe('subscribeUnreadAndMentionsByServer', () => {
    const serverUrl = 'test-server-unread-by-server';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return undefined when server does not exist', () => {
        const sub = subscribeUnreadAndMentionsByServer('http://nonexistent.com', jest.fn());
        expect(sub).toBeUndefined();
    });

    it('should bind serverUrl as first argument to observer', async () => {
        const observer = jest.fn();
        const sub = subscribeUnreadAndMentionsByServer(serverUrl, observer);

        expect(sub).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(observer).toHaveBeenCalledWith(serverUrl, expect.any(Object));

        sub?.unsubscribe();
    });
});

describe('getTotalMentionsForServer', () => {
    const serverUrl = 'test-server-mentions';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return 0 when server does not exist', async () => {
        const count = await getTotalMentionsForServer('http://nonexistent.com');
        expect(count).toBe(0);
    });

    it('should return 0 when no channels have mentions', async () => {
        const count = await getTotalMentionsForServer(serverUrl);
        expect(count).toBe(0);
    });

    it('should sum mentions_count from channels', async () => {
        const {basicTeam} = TestHelper;
        const ch1 = TestHelper.fakeChannelWithId(basicTeam!.id);
        const ch2 = TestHelper.fakeChannelWithId(basicTeam!.id);

        await operator.handleChannel({channels: [ch1, ch2], prepareRecordsOnly: false});
        await operator.handleMyChannel({
            channels: [ch1, ch2],
            myChannels: [
                TestHelper.fakeMyChannel({channel_id: ch1.id, mention_count: 3}),
                TestHelper.fakeMyChannel({channel_id: ch2.id, mention_count: 2}),
            ],
            prepareRecordsOnly: false,
        });

        const count = await getTotalMentionsForServer(serverUrl);
        expect(count).toBe(5);
    });
});
