// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Diagnostic probes for the watermark/interval desync class behind #9103 ("Empty channels").
//
// These assert WHAT THE CODE CURRENTLY DOES, so several of them assert broken outcomes on purpose.
// They are not regression tests and no fix is applied for them: the point is to establish which
// suspected mechanisms actually produce the reported symptoms (blank channel, permanently missing
// messages) and which turn out to be harmless.
//
// The two invariants under test:
//   I1  MyChannel.lastFetchedAt (the `since` watermark) must not exceed the newest post the
//       PostsInChannel intervals actually cover -- getPostsSince can never return anything older.
//   I2  The interval the channel list renders (postsInChannel[0]) must contain at least one post
//       the list can render. Under CRT the list renders root posts only.
//
// Scope, per probe, so none of this reads as more than it is:
//   - CRT is real here: it comes from persisted config + preference through getIsCRTEnabled, and
//     "toggling thread display mode" is modelled by writing the preference the user would change.
//   - Probes 1, 2 and 3 enter at storePostsForChannel, the storage step shared by the push path and
//     the deferred channel fetch. Probe 4 enters one step earlier, at convertToNotificationData ->
//     backgroundNotification, so the payload flag conversion is real code.
//   - Out of reach from Jest, and therefore NOT covered: the native iOS/Android notification fetch
//     and the native SQLite writers (ios/Gekidou, android/app/src/main/java/com/mattermost/helpers),
//     which maintain the same two tables with their own implementations.
//   - Probe 6 is explicitly a static model of a Swift predicate, not a test of it.

import {Q, type Database} from '@nozbe/watermelondb';

import {storePostsForChannel} from '@actions/local/post';
import {ActionType, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getRecentPostsInChannel, queryPostsBetween, queryPostsInChannel} from '@queries/servers/post';
import {getIsCRTEnabled} from '@queries/servers/thread';
import TestHelper from '@test/test_helper';
import {convertToNotificationData} from '@utils/notification';

import {backgroundNotification} from './notifications';
import {fetchPosts, fetchPostsAround, fetchPostsForChannel, refreshPostsForChannel} from './post';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@screens/navigation', () => ({
    navigateToRoot: jest.fn(),
    dismissAllModals: jest.fn(),
    popToRoot: jest.fn(),
}));

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

const emptyPage = () => ({posts: {}, order: []});
const pageOf = (posts: Post[]) => ({
    posts: Object.fromEntries(posts.map((p) => [p.id, p])),
    order: [...posts].sort((a, b) => b.create_at - a.create_at).map((p) => p.id),
});

const mockClient = {
    getPosts: jest.fn(),
    getPostsSince: jest.fn(),
    getPostsBefore: jest.fn(),
    getPostsAfter: jest.fn(),
    getPostThread: jest.fn(),
    getProfilesByIds: jest.fn(),
    getProfilesByUsernames: jest.fn(),
};

// mockClear() keeps queued mockImplementationOnce values alive, which leaks a one-time response
// from one probe into the next one that fetches. Reset and reinstall the defaults instead.
const resetClientMocks = () => {
    Object.values(mockClient).forEach((m) => m.mockReset());
    mockClient.getPosts.mockImplementation(emptyPage);
    mockClient.getPostsSince.mockImplementation(emptyPage);
    mockClient.getPostsBefore.mockImplementation(emptyPage);
    mockClient.getPostsAfter.mockImplementation(emptyPage);
    mockClient.getPostThread.mockImplementation(emptyPage);
    mockClient.getProfilesByIds.mockImplementation(() => []);
    mockClient.getProfilesByUsernames.mockImplementation(() => []);
};

// CRT as the app really computes it: server config plus the display preference the user toggles.
const setCRT = async (enabled: boolean) => {
    await operator.handlePreferences({
        preferences: [{
            category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
            name: Preferences.COLLAPSED_REPLY_THREADS,
            user_id: userId,
            value: enabled ? Preferences.COLLAPSED_REPLY_THREADS_ON : 'off',
        }],
        prepareRecordsOnly: false,
    });
};

beforeAll(() => {
    // @ts-expect-error partial client
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    const server = DatabaseManager.serverDatabases[serverUrl]!;
    database = server.database;
    operator = server.operator;
    resetClientMocks();

    await operator.handleConfigs({
        configs: [
            {id: 'Version', value: '11.10.0'},
            {id: 'CollapsedThreads', value: 'default_on'},
            {id: 'FeatureFlagCollapsedThreads', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
    await setCRT(true);

    const channel = TestHelper.fakeChannel({id: channelId, team_id: teamId});
    await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
    await operator.handleMyChannel({
        channels: [channel],
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
const renderedPosts = async () => {
    const chunks = await intervals();
    if (!chunks.length) {
        return [];
    }
    const isCRTEnabled = await getIsCRTEnabled(database);
    const {earliest, latest} = chunks[0];
    return queryPostsBetween(database, earliest, latest, Q.desc, '', channelId, isCRTEnabled ? '' : undefined).fetch();
};

const seedHistory = async (timestamps: number[]) => {
    const posts = timestamps.map((t) => post(`seed-${t}`, t));
    await storePostsForChannel(serverUrl, channelId, posts, posts.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
};

const seedRepliesOnlyInterval = async () => {
    const replies = [post('r1', 8000, {root_id: 'seed-1000'}), post('r2', 9000, {root_id: 'seed-1000'})];
    await storePostsForChannel(serverUrl, channelId, replies, replies.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
};

describe('PROBE 1: the watermark outruns the interval, and the next since-fetch cements the gap', () => {
    // Enters at the storage step. Probe 4a drives the same thing from the notification entry point.
    it('reproduces the hole and shows nothing will ever fetch it', async () => {
        await seedHistory([100, 105, 110]);
        expect(await watermark()).toBe(110);
        expect(await intervals()).toHaveLength(1);

        // A CRT thread reply, far newer than the interval (kondo97's repro).
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

        // A payload carrying a single old post that was edited recently. No thread involved.
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
        expect(await renderedPosts()).not.toHaveLength(0);
    });

    it('3b: a replies-only IN_CHANNEL store creates a disjoint interval that renders nothing under CRT', async () => {
        await seedHistory([1000, 2000]);
        await seedRepliesOnlyInterval();

        const chunks = await intervals();
        expect(chunks).toHaveLength(2);
        expect(chunks[0].earliest).toBe(8000);
        expect(chunks[0].latest).toBe(9000);

        // The reported symptom, then the reported recovery: the user toggles thread display mode.
        expect(await renderedPosts()).toHaveLength(0);
        await setCRT(false);
        expect(await renderedPosts()).toHaveLength(2);
    });

    it('3c: the automatic "too few posts" page fetch cannot dislodge the bad interval', async () => {
        await seedHistory([1000, 2000]);
        await seedRepliesOnlyInterval();

        // What channel_post_list does when the rendered list is short: fetchPosts page 0, which
        // under CRT returns root posts only -- all of them older than the replies-only interval.
        mockClient.getPosts.mockImplementationOnce(() => pageOf([post('seed-1000', 1000), post('seed-2000', 2000), post('newroot', 2500)]) as never);
        await fetchPosts(serverUrl, channelId);

        expect(mockClient.getPosts).toHaveBeenCalledTimes(1);
        expect((await intervals())[0].latest).toBe(9000); // still the replies-only interval
        expect(await renderedPosts()).toHaveLength(0);
    });

    it('3d: the interval prune added in #9970 does not catch it (CRT-blind predicate)', async () => {
        await seedHistory([1000, 2000]);
        await seedRepliesOnlyInterval();

        // getRecentPostsInChannel counts every non-deleted post in the interval, replies included,
        // so fetchPostsForChannel does not consider the channel blank and never prunes.
        expect(await getRecentPostsInChannel(database, channelId)).toHaveLength(2);
        await fetchPostsForChannel(serverUrl, channelId);
        expect((await intervals())[0].latest).toBe(9000);
        expect(await renderedPosts()).toHaveLength(0);
    });

    it('3e: pull-to-refresh on this branch does repair it', async () => {
        await seedHistory([1000, 2000]);
        await seedRepliesOnlyInterval();
        expect(await renderedPosts()).toHaveLength(0);

        // refreshPostsForChannel sees a blank list plus stored posts, so it clears the channel
        // cache and refetches from scratch instead of paging.
        mockClient.getPosts.mockImplementationOnce(() => pageOf([post('newroot', 2500)]) as never);
        await refreshPostsForChannel(serverUrl, channelId, true);

        const chunks = await intervals();
        expect(chunks).toHaveLength(1);
        expect(chunks[0].latest).toBe(2500);
        expect(await renderedPosts()).toHaveLength(1);
    });
});

describe('PROBE 4: backgroundNotification classifies a thread reply from the payload flag', () => {
    // Enters at convertToNotificationData with a raw payload, so the string/missing handling of
    // is_crt_enabled is real code. Still not covered: the native fetch that builds data.posts and
    // the native SQLite writers that touch the same two tables.
    const rawPush = (isCRTEnabled: string | undefined, posts: Post[], order: string[]) => convertToNotificationData({
        payload: {
            channel_id: channelId,
            team_id: teamId,
            post_id: order[0],
            root_id: 'root',
            type: 'message',
            version: 'v2',
            ...(isCRTEnabled === undefined ? {} : {is_crt_enabled: isCRTEnabled}),
            data: {
                posts: {posts: Object.fromEntries(posts.map((p) => [p.id, p])), order},
            },
        },
    } as never, false);

    it('4a: with is_crt_enabled "true", the reply is stored as a thread post (no interval change)', async () => {
        await seedHistory([100, 110]);
        const reply = post('reply', 200, {root_id: 'root'});

        const notification = rawPush('true', [reply], [reply.id]);
        expect(notification.payload!.isCRTEnabled).toBe(true);

        await backgroundNotification(serverUrl, notification);

        expect((await intervals())[0].latest).toBe(110);
        expect(await watermark()).toBe(200);
    });

    it('4b: with is_crt_enabled absent, the same reply is stored as a channel post', async () => {
        await seedHistory([100, 110]);
        const reply = post('reply', 200, {root_id: 'root'});

        // A payload without the field converts to isCRTEnabled false, while the app has CRT on:
        // the classification disagrees with how the channel list will render.
        const notification = rawPush(undefined, [reply], [reply.id]);
        expect(notification.payload!.isCRTEnabled).toBe(false);
        expect(await getIsCRTEnabled(database)).toBe(true);

        await backgroundNotification(serverUrl, notification);

        // One push creates a disjoint interval holding nothing but that reply, and it becomes the
        // interval the channel list renders: blank under CRT, visible with CRT off.
        const chunks = await intervals();
        expect(chunks).toHaveLength(2);
        expect(chunks[0].earliest).toBe(200);
        expect(chunks[0].latest).toBe(200);
        expect(await renderedPosts()).toHaveLength(0);
        await setCRT(false);
        expect(await renderedPosts()).toHaveLength(1);
    });
});

describe('PROBE 7: a thread-reply push on a channel with no local history', () => {
    it('leaves a watermark with no interval at all, so the channel has nothing to render', async () => {
        // Nothing seeded: a channel in the sidebar the user has never opened.
        expect(await intervals()).toHaveLength(0);

        const reply = post('reply', 200, {root_id: 'root'});
        await backgroundNotification(serverUrl, convertToNotificationData({
            payload: {
                channel_id: channelId,
                team_id: teamId,
                post_id: reply.id,
                root_id: 'root',
                type: 'message',
                version: 'v2',
                is_crt_enabled: 'true',
                data: {posts: {posts: {[reply.id]: reply}, order: [reply.id]}},
            },
        } as never, false));

        // The corruption: a watermark for a channel we hold no interval for. Every later
        // getPostsSince(200) can only return newer posts, so the history is out of reach.
        expect(await watermark()).toBe(200);
        expect(await intervals()).toHaveLength(0);
        expect(await renderedPosts()).toHaveLength(0);

        // On this branch #9970 refuses to trust the watermark when nothing renders, so the channel
        // recovers with a page fetch. Verified against the pre-#9970 line, which asks
        // getPostsSince(200) here and leaves the channel empty.
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
        expect(await renderedPosts()).toHaveLength(0);
    });
});

describe('PROBE 6: STATIC MODEL of the native interval predicate (does not execute Swift)', () => {
    // Transcription of ios/Gekidou/Sources/Gekidou/Storage/Database+Posts.swift:159-186, which
    // selects the interval to extend with `earliest <= new.earliest || latest >= new.latest`.
    // It will keep passing if that Swift changes, and it exercises neither SQLite selection nor the
    // update itself. Running the real thing needs the pod workspace (Gekidou has no Package.swift),
    // so treat this as explanatory evidence only.
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
