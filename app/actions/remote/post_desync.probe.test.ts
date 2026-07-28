// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Diagnostic probes for the watermark/interval desync class behind #9103 ("Empty channels").
//
// Each probe drives real code and then asserts WHAT THE CODE CURRENTLY DOES, so several of them
// assert broken outcomes on purpose. They are not regression tests and no fix is applied here:
// the point is to find out which of the suspected mechanisms actually produce the reported
// symptoms (blank channel / permanently missing messages) and which ones turn out to be harmless.
//
// The two invariants under test:
//   I1  MyChannel.lastFetchedAt (the `since` watermark) must not exceed the newest post the
//       PostsInChannel intervals actually cover -- getPostsSince can never return anything older.
//   I2  The interval the channel list renders (postsInChannel[0]) must contain at least one post
//       the list can render. Under CRT the list renders root posts only.

import {Q, type Database} from '@nozbe/watermelondb';

import {storePostsForChannel} from '@actions/local/post';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getRecentPostsInChannel, queryPostsBetween, queryPostsInChannel} from '@queries/servers/post';
import TestHelper from '@test/test_helper';

import {backgroundNotification} from './notifications';
import {fetchPostsAround, fetchPostsForChannel} from './post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'desync.probe.test.com';
const channelId = 'channelid1';
const teamId = 'teamid1';
const userId = 'userid1';

let database: Database;
let operator: ServerDataOperator;

const post = (id: string, createAt: number, over: Partial<Post> = {}) => TestHelper.fakePost({
    id,
    channel_id: channelId,
    user_id: userId,
    create_at: createAt,
    update_at: createAt,
    ...over,
});

const mockClient = {
    getPosts: jest.fn(() => ({posts: {}, order: []})),
    getPostsSince: jest.fn(() => ({posts: {}, order: []})),
    getPostsBefore: jest.fn(() => ({posts: {}, order: []})),
    getPostsAfter: jest.fn(() => ({posts: {}, order: []})),
    getPostThread: jest.fn(() => ({posts: {}, order: []})),
    getProfilesByIds: jest.fn(() => []),
    getProfilesByUsernames: jest.fn(() => []),
};

let mockIsCRTEnabled: jest.Mock;
jest.mock('@queries/servers/thread', () => {
    const original = jest.requireActual('@queries/servers/thread');
    mockIsCRTEnabled = jest.fn(() => true);
    return {...original, getIsCRTEnabled: mockIsCRTEnabled};
});

beforeAll(() => {
    // @ts-expect-error partial client
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const server = DatabaseManager.serverDatabases[serverUrl]!;
    database = server.database;
    operator = server.operator;
    mockIsCRTEnabled.mockImplementation(() => true);
    Object.values(mockClient).forEach((m) => m.mockClear());

    await operator.handleChannel({channels: [TestHelper.fakeChannel({id: channelId, team_id: teamId})], prepareRecordsOnly: false});
    await operator.handleMyChannel({
        channels: [TestHelper.fakeChannel({id: channelId, team_id: teamId})],
        myChannels: [TestHelper.fakeChannelMember({id: channelId, channel_id: channelId, user_id: userId})],
        prepareRecordsOnly: false,
    });
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

const intervals = () => queryPostsInChannel(database, channelId).fetch();
const watermark = async () => (await getMyChannel(database, channelId))!.lastFetchedAt;

// Mirrors the channel post list enhancer (app/screens/channel/channel_post_list/index.ts): it
// renders postsInChannel[0] only, and filters to root posts when CRT is on.
const renderedPosts = async (isCRTEnabled: boolean) => {
    const chunks = await intervals();
    if (!chunks.length) {
        return [];
    }
    const {earliest, latest} = chunks[0];
    return queryPostsBetween(database, earliest, latest, Q.desc, '', channelId, isCRTEnabled ? '' : undefined).fetch();
};

const seedHistory = async (timestamps: number[]) => {
    const posts = timestamps.map((t) => post(`seed-${t}`, t));
    await storePostsForChannel(serverUrl, channelId, posts, posts.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
};

describe('PROBE 1: a thread-reply push moves the watermark past the interval, and the next since-fetch cements the gap', () => {
    it('reproduces the hole and shows nothing will ever fetch it', async () => {
        await seedHistory([100, 105, 110]);
        expect(await watermark()).toBe(110);
        expect(await intervals()).toHaveLength(1);

        // The push path: a CRT thread reply, far newer than the interval (kondo97's repro).
        const root = post('root', 90);
        const reply = post('reply', 200, {root_id: 'root'});
        await storePostsForChannel(
            serverUrl, channelId, [root, reply], [reply.id, root.id], '',
            ActionType.POSTS.RECEIVED_IN_THREAD, [],
        );

        const afterPush = await intervals();
        expect(await watermark()).toBe(200); // watermark advanced
        expect(afterPush).toHaveLength(1);
        expect(afterPush[0].latest).toBe(110); // interval did not

        // Posts 111..199 exist on the server but were never fetched. The next channel open asks
        // for posts since the watermark, so they are already out of reach.
        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPostsSince).toHaveBeenCalledWith(channelId, 200, true, true, undefined);

        // And when a later since-fetch does bring something back, the interval is stretched over
        // the gap, so the app now claims to hold 111..199 contiguously.
        const newer = post('newer', 300);
        await storePostsForChannel(serverUrl, channelId, [newer], [newer.id], '', ActionType.POSTS.RECEIVED_SINCE, []);

        const afterSince = await intervals();
        expect(afterSince).toHaveLength(1);
        expect(afterSince[0].earliest).toBe(100);
        expect(afterSince[0].latest).toBe(300);

        // Interval claims [100,300]; the posts it actually holds skip everything between 110 and 200.
        // (The thread root at 90 is not even in the interval, so it never renders in the channel.)
        const held = (await queryPostsBetween(database, 100, 300, Q.desc, '', channelId).fetch()).map((p) => p.createAt).sort((a, b) => a - b);
        expect(held).toEqual([100, 105, 110, 200, 300]);
    });
});

describe('PROBE 2: an edited old post in a partial payload pushes the watermark past the interval', () => {
    it('advances lastFetchedAt to update_at while the interval only tracks create_at', async () => {
        await seedHistory([100, 105, 110]);

        // A push payload carrying a single old post that was edited recently. No thread involved.
        const edited = post('seed-105', 105, {update_at: 5000});
        await storePostsForChannel(serverUrl, channelId, [edited], [edited.id], '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        expect((await intervals())[0].latest).toBe(110);
        expect(await watermark()).toBe(5000);

        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPostsSince).toHaveBeenCalledWith(channelId, 5000, true, true, undefined);
    });
});

describe('PROBE 3: an interval that holds only thread replies renders a blank channel under CRT', () => {
    it('3a: extending the interval with replies is harmless', async () => {
        await seedHistory([1000, 2000]);

        const replies = [post('r1', 8000, {root_id: 'seed-1000'}), post('r2', 9000, {root_id: 'seed-1000'})];
        await storePostsForChannel(serverUrl, channelId, replies, replies.map((p) => p.id), '', ActionType.POSTS.RECEIVED_SINCE, []);

        const chunks = await intervals();
        expect(chunks).toHaveLength(1);
        expect(chunks[0].latest).toBe(9000);
        expect(await renderedPosts(true)).not.toHaveLength(0);
    });

    it('3b: a replies-only IN_CHANNEL store creates a disjoint interval that renders nothing under CRT', async () => {
        await seedHistory([1000, 2000]);

        const replies = [post('r1', 8000, {root_id: 'seed-1000'}), post('r2', 9000, {root_id: 'seed-1000'})];
        await storePostsForChannel(serverUrl, channelId, replies, replies.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        const chunks = await intervals();
        expect(chunks).toHaveLength(2);
        expect(chunks[0].earliest).toBe(8000);
        expect(chunks[0].latest).toBe(9000);

        // The reported symptom and the reported recovery, side by side.
        expect(await renderedPosts(true)).toHaveLength(0);
        expect(await renderedPosts(false)).toHaveLength(2);
    });

    it('3c: a full page fetch cannot dislodge the bad interval', async () => {
        await seedHistory([1000, 2000]);
        const replies = [post('r1', 8000, {root_id: 'seed-1000'}), post('r2', 9000, {root_id: 'seed-1000'})];
        await storePostsForChannel(serverUrl, channelId, replies, replies.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        // What pull-to-refresh and the "too few posts" fallback do: page 0 with CRT, i.e. roots only.
        const roots = [post('seed-1000', 1000), post('seed-2000', 2000), post('newroot', 2500)];
        mockClient.getPosts.mockImplementationOnce(() => ({
            posts: Object.fromEntries(roots.map((p) => [p.id, p])),
            order: roots.map((p) => p.id).reverse(),
        }) as never);
        await storePostsForChannel(serverUrl, channelId, roots, roots.map((p) => p.id).reverse(), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        const chunks = await intervals();
        expect(chunks[0].latest).toBe(9000); // still the replies-only interval
        expect(await renderedPosts(true)).toHaveLength(0);
    });

    it('3d: the interval prune added in #9970 does not catch it (CRT-blind predicate)', async () => {
        await seedHistory([1000, 2000]);
        const replies = [post('r1', 8000, {root_id: 'seed-1000'}), post('r2', 9000, {root_id: 'seed-1000'})];
        await storePostsForChannel(serverUrl, channelId, replies, replies.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        // getRecentPostsInChannel counts every non-deleted post in the interval, replies included,
        // so fetchPostsForChannel does not consider the channel blank and never prunes.
        expect(await getRecentPostsInChannel(database, channelId)).toHaveLength(2);
        await fetchPostsForChannel(serverUrl, channelId);
        expect((await intervals())[0].latest).toBe(9000);
        expect(await renderedPosts(true)).toHaveLength(0);
    });
});

describe('PROBE 4: backgroundNotification classifies a thread reply from the payload flag', () => {
    const pushNotification = (isCRTEnabled: boolean | undefined, posts: Post[], order: string[]) => ({
        payload: {
            channel_id: channelId,
            team_id: teamId,
            post_id: order[0],
            root_id: 'root',
            isCRTEnabled,
            data: {
                posts: {posts: Object.fromEntries(posts.map((p) => [p.id, p])), order},
            },
        },
    });

    it('4a: with the flag set, the reply is stored as a thread post (no interval change)', async () => {
        await seedHistory([100, 110]);
        const reply = post('reply', 200, {root_id: 'root'});

        await backgroundNotification(serverUrl, pushNotification(true, [reply], [reply.id]) as never);

        expect((await intervals())[0].latest).toBe(110);
        expect(await watermark()).toBe(200);
    });

    // convertToNotificationData turns a missing `is_crt_enabled` into `false`, so `false` is what a
    // payload without the field (or one the platform failed to parse) looks like by the time it
    // reaches here. This probe is therefore a CRT mismatch: the app has CRT on, the payload says off.
    it('4b: with the flag false while the app has CRT on, the same reply is stored as a channel post', async () => {
        await seedHistory([100, 110]);
        const reply = post('reply', 200, {root_id: 'root'});

        await backgroundNotification(serverUrl, pushNotification(false, [reply], [reply.id]) as never);

        // A single push creates a disjoint interval holding nothing but that reply, and it becomes
        // the interval the channel list renders: blank under CRT, visible with CRT off.
        const chunks = await intervals();
        expect(chunks).toHaveLength(2);
        expect(chunks[0].earliest).toBe(200);
        expect(chunks[0].latest).toBe(200);
        expect(await renderedPosts(true)).toHaveLength(0);
        expect(await renderedPosts(false)).toHaveLength(1);
    });
});

describe('PROBE 7: a thread-reply push on a channel with no local history', () => {
    it('leaves a watermark with no interval at all, so the channel has nothing to render', async () => {
        // Nothing seeded: a channel in the sidebar the user has never opened.
        expect(await intervals()).toHaveLength(0);

        const reply = post('reply', 200, {root_id: 'root'});
        await backgroundNotification(serverUrl, {
            payload: {
                channel_id: channelId,
                team_id: teamId,
                post_id: reply.id,
                root_id: 'root',
                isCRTEnabled: true,
                data: {posts: {posts: {[reply.id]: reply}, order: [reply.id]}},
            },
        } as never);

        // The corruption: a watermark for a channel we hold no interval for. Every later
        // getPostsSince(200) can only return newer posts, so the history is out of reach.
        expect(await watermark()).toBe(200);
        expect(await intervals()).toHaveLength(0);
        expect(await renderedPosts(true)).toHaveLength(0);

        // On this branch #9970 refuses to trust the watermark when nothing renders, so the channel
        // recovers with a page fetch. Upstream (2.42.2) this line asks getPostsSince(200) instead.
        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPosts).toHaveBeenCalled();
        expect(mockClient.getPostsSince).not.toHaveBeenCalled();
    });
});

describe('PROBE 5: RECEIVED_AROUND stores posts with no interval bookkeeping', () => {
    it('leaves the fetched posts outside every interval', async () => {
        const around = [post('a1', 500), post('a2', 600), post('a3', 700)];
        mockClient.getPostsBefore.mockImplementationOnce(() => ({posts: {a1: around[0]}, order: ['a1']}) as never);
        mockClient.getPostsAfter.mockImplementationOnce(() => ({posts: {a3: around[2]}, order: ['a3']}) as never);
        mockClient.getPostThread.mockImplementationOnce(() => ({posts: {a2: around[1]}, order: ['a2']}) as never);

        await fetchPostsAround(serverUrl, channelId, 'a2', 5, true);

        expect(await queryPostsBetween(database, 0, 1000, Q.desc, '', channelId).fetch()).toHaveLength(3);
        expect(await intervals()).toHaveLength(0);
        expect(await renderedPosts(true)).toHaveLength(0);
    });
});

describe('PROBE 6: the native interval predicate, transcribed', () => {
    // ios/Gekidou/Sources/Gekidou/Storage/Database+Posts.swift:159-186 selects the interval to
    // extend with `earliest <= new.earliest || latest >= new.latest` -- not an overlap test. The
    // Swift tests need the pod workspace, so this transcribes the predicate to show the property.
    const nativePick = (chunks: Array<{earliest: number; latest: number}>, earliest: number, latest: number) => {
        return chunks.
            filter((c) => c.earliest <= earliest || c.latest >= latest).
            sort((a, b) => b.latest - a.latest)[0];
    };

    it('picks an interval that ended long before the new posts, and swallows the gap', () => {
        const chunks = [{earliest: 100, latest: 110}];
        const picked = nativePick(chunks, 5000, 5000);

        expect(picked).toBeDefined();
        const merged = {earliest: Math.min(picked.earliest, 5000), latest: Math.max(picked.latest, 5000)};
        expect(merged).toEqual({earliest: 100, latest: 5000});
    });

    it('the JS overlap test rejects the same pair', () => {
        const jsOverlaps = (chunk: {earliest: number; latest: number}, earliest: number, latest: number) =>
            (earliest >= chunk.earliest && earliest <= chunk.latest) ||
            (latest <= chunk.latest && latest >= chunk.earliest);

        expect(jsOverlaps({earliest: 100, latest: 110}, 5000, 5000)).toBe(false);
    });
});
