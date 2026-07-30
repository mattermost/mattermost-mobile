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
//   I1  SYNC COMPLETENESS. MyChannel.lastFetchedAt may only advance to T once every change with
//       update_at <= T has been processed, because getPostsSince(T) filters on update_at and can
//       never return a post created before T that was not edited after it. Note what I1 is NOT:
//       lastFetchedAt > interval.latest is legitimate on its own, since the watermark is
//       max(create_at, update_at, delete_at) while intervals track create_at, so any edit of an old
//       post diverges them harmlessly. Divergence is not loss; loss needs an unfetched post whose
//       update_at sits below the watermark (PROBE 1) and out of reach of paging (PROBE 1b).
//   I2  The interval the channel list renders (postsInChannel[0]) must contain at least one post
//       the list can render. Under CRT the list renders root posts only.
//
// Scope, per probe, so none of this reads as more than it is:
//   - CRT is real here: it comes from persisted config + preference through getIsCRTEnabled, and
//     "toggling thread display mode" is modelled by writing the preference the user would change.
//   - The server side is modelled (see fakeServer) with the semantics that decide these probes, so
//     "still missing" can be asserted after actually running every mechanism that refetches.
//   - Notifications: probes 1, 4, 7 and 9 enter at convertToNotificationData ->
//     backgroundNotification, the JS path that runs while the app is alive in the background, so the
//     payload flag conversion is real code. NOT covered: fetchNotificationData/openNotification
//     (tap-through), and the native handlers that run when the app is killed.
//   - WebSocket: probes 8 and 9 drive handleNewPostEvent, the path that writes intervals for live
//     posts. NOT covered: handleReconnect/doReconnect (it runs the whole entry sync, which needs far
//     more of the app stubbed), handlePostDeleted, and the channel-membership events that also store
//     posts. Probes 2 and 3 enter at storePostsForChannel, the storage step shared by the push path
//     and the deferred channel fetch.
//   - Out of reach from Jest, and therefore NOT covered: the native iOS/Android notification fetch
//     and the native SQLite writers (ios/Gekidou, android/app/src/main/java/com/mattermost/helpers),
//     which maintain the same two tables with their own implementations.
//   - Probe 6 is explicitly a static model of a Swift predicate, not a test of it.

import {Q, type Database} from '@nozbe/watermelondb';

import {storePostsForChannel} from '@actions/local/post';
import {handleNewPostEvent} from '@actions/websocket/posts';
import {ActionType, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';
import {getRecentPostsInChannel, queryPostsBetween, queryPostsInChannel} from '@queries/servers/post';
import {getIsCRTEnabled} from '@queries/servers/thread';
import TestHelper from '@test/test_helper';
import {convertToNotificationData} from '@utils/notification';

import {backgroundNotification} from './notifications';
import {fetchPosts, fetchPostsAround, fetchPostsBefore, fetchPostsForChannel, refreshPostsForChannel} from './post';

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

// A stand-in for the server's post endpoints with the semantics that decide these probes:
//   - getPostsSince filters on update_at, so a post created inside a gap and never edited after the
//     watermark is invisible to it no matter how many times the app syncs;
//   - getPosts pages by create_at, newest first, and returns root posts only under CRT, so it only
//     reaches back POST_CHUNK_SIZE posts;
//   - getPostsBefore pages backwards from a given post, so it can only fill below the oldest post
//     the list already holds, never a gap in the middle.
// Every probe seeds this instead of queueing one-off responses, which also removes the
// mockImplementationOnce leak class entirely.
const fakeServer: {posts: Post[]} = {posts: []};

const seedServer = (posts: Post[]) => {
    fakeServer.posts = [...posts];
};

const newestFirst = (posts: Post[]) => [...posts].sort((a, b) => b.create_at - a.create_at);

const respond = (selected: Post[]) => {
    const ordered = newestFirst(selected);
    const oldest = ordered[ordered.length - 1];
    const older = oldest ? newestFirst(fakeServer.posts.filter((p) => p.create_at < oldest.create_at)) : [];
    return {
        posts: Object.fromEntries(ordered.map((p) => [p.id, p])),
        order: ordered.map((p) => p.id),
        prev_post_id: older[0]?.id ?? '',
    };
};

const mockClient = {
    getPosts: jest.fn((_channelId: string, page = 0, perPage = 60, collapsedThreads = false) => {
        const pool = collapsedThreads ? fakeServer.posts.filter((p) => !p.root_id) : fakeServer.posts;
        return respond(newestFirst(pool).slice(page * perPage, (page + 1) * perPage));
    }),
    getPostsSince: jest.fn((_channelId: string, since: number) => {
        return respond(fakeServer.posts.filter((p) => p.update_at > since));
    }),
    getPostsBefore: jest.fn((_channelId: string, postId: string, page = 0, perPage = 60, collapsedThreads = false) => {
        const from = fakeServer.posts.find((p) => p.id === postId);
        const pool = (collapsedThreads ? fakeServer.posts.filter((p) => !p.root_id) : fakeServer.posts).
            filter((p) => from && p.create_at < from.create_at);
        return respond(newestFirst(pool).slice(page * perPage, (page + 1) * perPage));
    }),
    getPostsAfter: jest.fn((_channelId: string, postId: string, page = 0, perPage = 60) => {
        const from = fakeServer.posts.find((p) => p.id === postId);
        const pool = fakeServer.posts.filter((p) => from && p.create_at > from.create_at);
        return respond(newestFirst(pool).slice(page * perPage, (page + 1) * perPage));
    }),
    getPostThread: jest.fn((postId: string) => {
        const root = fakeServer.posts.find((p) => p.id === postId);
        const replies = fakeServer.posts.filter((p) => p.root_id === postId);
        return respond([...(root ? [root] : []), ...replies]);
    }),
    getProfilesByIds: jest.fn(() => []),
    getProfilesByUsernames: jest.fn(() => []),
};

const resetClientMocks = () => {
    Object.values(mockClient).forEach((m) => m.mockClear());
    fakeServer.posts = [];
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
    const serverDb = DatabaseManager.serverDatabases[serverUrl]!;
    database = serverDb.database;
    operator = serverDb.operator;
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

const pushThreadReply = (reply: Post) => backgroundNotification(serverUrl, convertToNotificationData({
    payload: {
        channel_id: channelId,
        team_id: teamId,
        post_id: reply.id,
        root_id: reply.root_id,
        type: 'message',
        version: 'v2',
        is_crt_enabled: 'true',
        data: {posts: {posts: {[reply.id]: reply}, order: [reply.id]}},
    },
} as never, false));

const wsNewPost = (p: Post) => handleNewPostEvent(serverUrl, {
    event: 'posted',
    data: {post: JSON.stringify(p)},
    broadcast: {channel_id: channelId, omit_users: null, user_id: '', team_id: teamId},
    seq: 1,
} as never);

const heldCreateAts = async () => (await queryPostsBetween(database, 0, Number.MAX_SAFE_INTEGER, Q.desc, '', channelId).fetch()).
    map((p) => p.createAt).sort((a, b) => a - b);

describe('PROBE 1: does the watermark hole actually lose messages?', () => {
    // The hole itself is easy to produce, but "permanently missing" has to survive every mechanism
    // that refetches: the since-fetch, the page-zero fallback channel_post_list runs whenever the
    // rendered list is shorter than POST_CHUNK_SIZE, and the scroll-back fetch. So the server is
    // modelled here (getPostsSince filters on update_at) and each mechanism is actually run.
    const history = [post('seed-100', 100), post('seed-105', 105), post('seed-110', 110)];
    const missed = [post('missed-150', 150), post('missed-160', 160)];
    const reply = post('reply-170', 170, {root_id: 'seed-100'});

    it('1a: with fewer than a page of posts above the gap, the page-zero fallback heals it', async () => {
        seedServer([...history, ...missed, reply]);
        await storePostsForChannel(serverUrl, channelId, history, history.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
        expect(await watermark()).toBe(110);

        // The push moves the watermark past the interval without extending it.
        await pushThreadReply(reply);
        expect(await watermark()).toBe(170);
        expect((await intervals())[0].latest).toBe(110);

        // Opening the channel asks for changes since 170, which cannot return posts created at 150
        // and 160 and never edited: the hole is real at this point.
        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPostsSince).toHaveBeenCalledWith(channelId, 170, true, true, undefined);
        expect(await heldCreateAts()).toEqual([100, 105, 110, 170]);

        // But the list is far shorter than POST_CHUNK_SIZE, so channel_post_list fetches page zero,
        // which pages by create_at and does reach back over the gap.
        await fetchPosts(serverUrl, channelId);
        expect(await heldCreateAts()).toEqual([100, 105, 110, 150, 160, 170]);
    });

    it('1b: with a full page of posts above the gap, nothing can reach it any more', async () => {
        // 60 posts newer than the gap, so page zero never pages back far enough.
        const newer = Array.from({length: 60}, (_, i) => post(`newer-${200 + i}`, 200 + i));
        seedServer([...history, ...missed, reply, ...newer]);
        await storePostsForChannel(serverUrl, channelId, history, history.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        await pushThreadReply(reply);
        expect(await watermark()).toBe(170);

        // Reconnect sync: everything with update_at > 170 arrives and extends the interval over the
        // gap, so the app now claims to hold 150 and 160 contiguously.
        await fetchPostsForChannel(serverUrl, channelId);
        const claimed = await intervals();
        expect(claimed).toHaveLength(1);
        expect(claimed[0].earliest).toBe(100);
        expect(claimed[0].latest).toBe(259);
        expect(await watermark()).toBe(259);
        expect(await heldCreateAts()).not.toContain(150);

        // Now run every mechanism that could refetch, and show none of them can.
        await fetchPostsForChannel(serverUrl, channelId); // since-fetch: filters on update_at
        await fetchPosts(serverUrl, channelId); // page zero: newest 60 by create_at, i.e. 200..259
        const rendered = await renderedPosts();
        const oldestRendered = rendered[rendered.length - 1];
        expect(oldestRendered.createAt).toBe(100);
        await fetchPostsBefore(serverUrl, channelId, oldestRendered.id); // scroll-back: below 100 only

        const held = await heldCreateAts();
        expect(held).not.toContain(150);
        expect(held).not.toContain(160);

        // The two posts are inside the interval the app believes is complete, so no later sync will
        // ask for them: they are permanently missing from this install.
        expect(claimed[0].earliest).toBeLessThan(150);
        expect(claimed[0].latest).toBeGreaterThan(160);
    });
});

describe('PROBE 2: what the watermark/interval divergence does and does not mean', () => {
    // The watermark is max(create_at, update_at, delete_at) while intervals track create_at, so an
    // edit of an old post diverges them by design. That alone is not loss -- getPostsSince filters
    // on update_at, so whether a post inside the gap is still reachable depends on its update_at.
    it('a post edited after the watermark stays reachable; one created before it does not', async () => {
        const history = [post('seed-100', 100), post('seed-110', 110)];
        const neverEdited = post('gap-a', 150);
        const editedLater = post('gap-b', 160, {update_at: 6000});
        seedServer([...history, neverEdited, editedLater]);

        await storePostsForChannel(serverUrl, channelId, history, history.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        // A payload carrying one old post that was edited recently: legitimate divergence.
        const edited = post('seed-105', 105, {update_at: 5000});
        await storePostsForChannel(serverUrl, channelId, [edited], [edited.id], '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
        expect(await watermark()).toBe(5000);
        expect((await intervals())[0].latest).toBe(110);

        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPostsSince).toHaveBeenCalledWith(channelId, 5000, true, true, undefined);

        // gap-b was edited after the watermark so the since-fetch still returns it; gap-a was not,
        // so it is only reachable by paging. The divergence is not the defect -- the unprocessed
        // create inside the skipped window is.
        const held = await heldCreateAts();
        expect(held).toContain(160);
        expect(held).not.toContain(150);
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
        seedServer([post('seed-1000', 1000), post('seed-2000', 2000), post('newroot', 2500)]);
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
        seedServer([post('seed-1000', 1000), post('seed-2000', 2000), post('newroot', 2500)]);
        await refreshPostsForChannel(serverUrl, channelId, true);

        const chunks = await intervals();
        expect(chunks).toHaveLength(1);
        expect(chunks[0].latest).toBe(2500);
        expect(await renderedPosts()).toHaveLength(3);
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
        // Nothing stored locally: a channel in the sidebar the user has never opened. The server
        // does hold its history, so we can tell recovery from silence.
        const reply = post('reply', 200, {root_id: 'root'});
        seedServer([post('seed-100', 100), post('seed-105', 105), post('seed-110', 110), reply]);
        expect(await intervals()).toHaveLength(0);
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
        // recovers with a page fetch that actually renders the history. Verified against the
        // pre-#9970 line, which asks getPostsSince(200) here and renders nothing.
        await fetchPostsForChannel(serverUrl, channelId);
        expect(mockClient.getPosts).toHaveBeenCalled();
        expect(mockClient.getPostsSince).not.toHaveBeenCalled();
        expect(await intervals()).toHaveLength(1);
        expect((await renderedPosts()).map((p) => p.createAt).sort((a, b) => a - b)).toEqual([100, 105, 110]);
    });
});

describe('PROBE 5: RECEIVED_AROUND stores posts with no interval bookkeeping', () => {
    it('leaves the fetched posts outside every interval', async () => {
        seedServer([post('a1', 500), post('a2', 600), post('a3', 700)]);

        await fetchPostsAround(serverUrl, channelId, 'a2', 5, true);

        expect(await queryPostsBetween(database, 0, 1000, Q.desc, '', channelId).fetch()).toHaveLength(3);
        expect(await intervals()).toHaveLength(0);
        expect(await renderedPosts()).toHaveLength(0);
    });
});

describe('PROBE 8: a websocket post extends the interval across a gap the socket missed', () => {
    it('lies about contiguity but leaves the watermark behind, so the next since-fetch heals it', async () => {
        const history = [post('seed-100', 100), post('seed-105', 105), post('seed-110', 110)];
        const missed = [post('missed-150', 150), post('missed-160', 160)];
        const live = post('live-200', 200);
        seedServer([...history, ...missed, live]);
        await storePostsForChannel(serverUrl, channelId, history, history.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);
        expect(await watermark()).toBe(110);

        // The socket dropped while 150 and 160 were created, then delivers 200 on reconnect.
        await wsNewPost(live);

        // handleReceivedNewPostForChannel extends chunks[0].latest with no contiguity check, so the
        // interval now claims two posts the app never fetched. No push notification involved.
        const claimed = await intervals();
        expect(claimed).toHaveLength(1);
        expect(claimed[0].latest).toBe(200);
        expect(await heldCreateAts()).toEqual([100, 105, 110, 200]);

        // The saving grace: the websocket path does not touch lastFetchedAt, so the watermark stays
        // behind the gap and the next since-fetch fills it. The interval lie is self-correcting.
        expect(await watermark()).toBe(110);
        await fetchPostsForChannel(serverUrl, channelId);
        expect(await heldCreateAts()).toEqual([100, 105, 110, 150, 160, 200]);
    });
});

describe('PROBE 9: push then websocket backlog, the field sequence', () => {
    it('loses the missed posts for good, through the real notification and websocket paths', async () => {
        const history = [post('seed-100', 100), post('seed-105', 105), post('seed-110', 110)];
        const missed = [post('missed-150', 150), post('missed-160', 160)];
        const reply = post('reply-170', 170, {root_id: 'seed-100'});
        const live = Array.from({length: 60}, (_, i) => post(`live-${200 + i}`, 200 + i));
        seedServer([...history, ...missed, reply, ...live]);
        await storePostsForChannel(serverUrl, channelId, history, history.map((p) => p.id), '', ActionType.POSTS.RECEIVED_IN_CHANNEL, []);

        // 1. App suspended with the socket down: 150 and 160 are missed, then a push for a thread
        //    reply is processed by JS, which advances the watermark past them.
        await pushThreadReply(reply);
        expect(await watermark()).toBe(170);
        expect((await intervals())[0].latest).toBe(110);

        // 2. The socket comes back and the backlog streams in as posted events, each extending the
        //    interval, so it ends up spanning the gap.
        for (const p of live) {
            /* eslint-disable-next-line no-await-in-loop */
            await wsNewPost(p);
        }
        const claimed = await intervals();
        expect(claimed).toHaveLength(1);
        expect(claimed[0].earliest).toBe(100);
        expect(claimed[0].latest).toBe(259);
        expect(await heldCreateAts()).not.toContain(150);

        // 3. Everything that could still refetch: the since-fetch cannot see update_at 150/160 from
        //    a watermark of 170, page zero only reaches the newest 60 by create_at, and scroll-back
        //    pages below the oldest post held rather than through the middle.
        await fetchPostsForChannel(serverUrl, channelId);
        await fetchPosts(serverUrl, channelId);
        const rendered = await renderedPosts();
        const oldestRendered = rendered[rendered.length - 1];
        expect(oldestRendered.createAt).toBe(100);
        await fetchPostsBefore(serverUrl, channelId, oldestRendered.id);

        const held = await heldCreateAts();
        expect(held).not.toContain(150);
        expect(held).not.toContain(160);
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
