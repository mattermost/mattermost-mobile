// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRequiredRedactionEpoch} from '@actions/local/redaction';
import {fetchPostById, revalidatePostsBefore} from '@actions/remote/post';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getNewerPostInChannel, getPostById} from '@queries/servers/post';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import RedactionRevalidationManager from './redaction_revalidation_manager';

import type PostModel from '@typings/database/models/servers/post';

jest.mock('@actions/remote/post', () => ({
    fetchPostById: jest.fn(() => Promise.resolve({post: {}})),
    revalidatePostsBefore: jest.fn(() => Promise.resolve({oldestCreateAt: undefined})),
}));
jest.mock('@actions/local/redaction', () => ({
    getRequiredRedactionEpoch: jest.fn(() => Promise.resolve(1)),
}));
jest.mock('@queries/servers/post', () => ({
    getPostById: jest.fn(() => Promise.resolve(undefined)),
    getNewerPostInChannel: jest.fn(() => Promise.resolve(undefined)),
}));
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getServerDatabaseAndOperator: jest.fn(() => ({database: {}})),
    },
}));

const serverUrl = 'revalidation.test.com';
const otherServerUrl = 'other-revalidation.test.com';

const DEBOUNCE_MS = 300;

const flushQueue = async () => {
    await advanceTimers(DEBOUNCE_MS + 50);
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await advanceTimers(0);
    }
};

beforeEach(() => {
    enableFakeTimers();

    // Reset, not clear: a failure implementation left by one test must not leak into the next.
    jest.mocked(fetchPostById).mockReset().mockResolvedValue({post: {} as Post, redactionVerifiedEpoch: 1});
    jest.mocked(getPostById).mockReset().mockResolvedValue(undefined);
    jest.mocked(getNewerPostInChannel).mockReset().mockResolvedValue(undefined);
    jest.mocked(revalidatePostsBefore).mockReset().mockResolvedValue({oldestCreateAt: undefined});
    jest.mocked(getRequiredRedactionEpoch).mockResolvedValue(1);
    jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as never);
});

afterEach(() => {
    RedactionRevalidationManager.removeServer(serverUrl);
    RedactionRevalidationManager.removeServer(otherServerUrl);
    disableFakeTimers();
});

describe('RedactionRevalidationManager', () => {
    it('should fetch a queued post without touching PostsInChannel', async () => {
        // A standalone fetch must not record the post as its channel's newest, or it creates an
        // interval over posts the client does not hold.
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();

        expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'post1', false, undefined, true);
        expect(revalidatePostsBefore).not.toHaveBeenCalled();
    });

    it('should collapse repeated appearances of the same post at the same generation', async () => {
        // Scrolling a post in and out of view must cost one request per generation, not one per pass.
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();

        expect(fetchPostById).toHaveBeenCalledTimes(1);
    });

    it('should replace a queued entry when a newer generation is required', async () => {
        jest.mocked(getRequiredRedactionEpoch).mockResolvedValue(2);

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 2);
        await flushQueue();

        expect(fetchPostById).toHaveBeenCalledTimes(1);
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.succeeded).toBe(1);
    });

    it('should never exceed the concurrency cap', async () => {
        let concurrent = 0;
        let peak = 0;
        jest.mocked(fetchPostById).mockImplementation(async () => {
            concurrent += 1;
            peak = Math.max(peak, concurrent);
            await Promise.resolve();
            concurrent -= 1;
            return {post: {} as Post, redactionVerifiedEpoch: undefined};
        });

        for (let i = 0; i < 10; i++) {
            RedactionRevalidationManager.enqueue(serverUrl, `post${i}`, 1);
        }
        await flushQueue();

        expect(peak).toBeLessThanOrEqual(3);
        expect(fetchPostById).toHaveBeenCalledTimes(10);
    });

    it('should discard work whose requirement moved on while it waited', async () => {
        jest.mocked(getRequiredRedactionEpoch).mockResolvedValue(5);

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();

        expect(fetchPostById).not.toHaveBeenCalled();
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.discardedStale).toBe(1);
    });

    it('should not retry a failed request on its own', async () => {
        // Retrying here would spin while offline; the post stays hidden until something re-enqueues it.
        jest.mocked(fetchPostById).mockResolvedValue({error: new Error('offline')});

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();
        await flushQueue();

        expect(fetchPostById).toHaveBeenCalledTimes(1);
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.failed).toBe(1);
    });

    it('should not request a post that a page fetch already re-verified', async () => {
        jest.mocked(getPostById).mockResolvedValue({redactionVerifiedEpoch: 1} as never);

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();

        expect(fetchPostById).not.toHaveBeenCalled();
    });

    it('should offer a retry for a failed post until it is queued again', async () => {
        // Nothing else asks again while connected, so without this the post would read "checking" forever.
        const failed: boolean[] = [];
        const subscription = RedactionRevalidationManager.observeRevalidationFailed(serverUrl, 'post1').subscribe((f) => failed.push(f));
        jest.mocked(fetchPostById).mockResolvedValueOnce({error: new Error('server error')});

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);

        expect(failed).toEqual([false, true, false]);
        subscription.unsubscribe();
    });

    it('should not touch a new session when logout lands mid-request', async () => {
        let resolve: (value: {error: unknown}) => void = () => undefined;
        jest.mocked(fetchPostById).mockImplementationOnce(() => new Promise((r) => {
            resolve = r;
        }));

        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        await flushQueue();
        RedactionRevalidationManager.removeServer(serverUrl);
        RedactionRevalidationManager.enqueue(serverUrl, 'post2', 1);
        resolve({error: new Error('late')});
        await flushQueue();

        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.failed).toBe(0);
        expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'post2', false, undefined, true);
    });

    it('should keep queues isolated between servers', async () => {
        RedactionRevalidationManager.enqueue(serverUrl, 'post1', 1);
        RedactionRevalidationManager.enqueue(otherServerUrl, 'post2', 1);

        // Logging out of one server must not discard the other's queued work.
        RedactionRevalidationManager.removeServer(serverUrl);
        await flushQueue();

        expect(fetchPostById).toHaveBeenCalledTimes(1);
        expect(fetchPostById).toHaveBeenCalledWith(otherServerUrl, 'post2', false, undefined, true);
    });
});

describe('RedactionRevalidationManager channel pages', () => {
    // A channel's history in newest-first order: p0 is the newest and already verified, the rest
    // are behind the required epoch of 1.
    type StoredPost = {id: string; channelId: string; createAt: number; redactionVerifiedEpoch: number};
    let store: Record<string, StoredPost>;
    let pageSize: number;

    const seedChannel = (channelId: string, count: number, prefix = 'p') => {
        for (let i = 0; i < count; i++) {
            const id = `${prefix}${i}`;
            store[id] = {id, channelId, createAt: 1000 - i, redactionVerifiedEpoch: i === 0 ? 1 : 0};
        }
    };

    const channelPosts = (channelId: string) => Object.values(store).filter((p) => p.channelId === channelId);

    // Re-verifies the pageSize posts older than the anchor, as the server's "before" page would.
    const serverPage = async (_serverUrl: string, channelId: string, anchorId: string) => {
        const block = channelPosts(channelId).
            filter((p) => p.createAt < store[anchorId].createAt).
            sort((a, b) => b.createAt - a.createAt).
            slice(0, pageSize);
        for (const p of block) {
            p.redactionVerifiedEpoch = 1;
        }
        return {oldestCreateAt: block.length ? Math.min(...block.map((p) => p.createAt)) : undefined};
    };

    const enqueueInChannel = (ids: string[]) => {
        for (const id of ids) {
            RedactionRevalidationManager.enqueue(serverUrl, id, 1, Screens.CHANNEL);
        }
    };

    const flushAll = async () => {
        for (let i = 0; i < 5; i++) {
            // eslint-disable-next-line no-await-in-loop
            await flushQueue();
        }
    };

    beforeEach(() => {
        store = {};
        pageSize = 60;
        jest.mocked(getPostById).mockImplementation(async (_db, id) => (store[id] ? {...store[id]} as unknown as PostModel : undefined));
        jest.mocked(getNewerPostInChannel).mockImplementation(async (_db, channelId, createAt) => {
            const newer = channelPosts(channelId).filter((p) => p.createAt > createAt).sort((a, b) => a.createAt - b.createAt)[0];
            return newer as unknown as PostModel | undefined;
        });
        jest.mocked(revalidatePostsBefore).mockImplementation(serverPage);
    });

    it('should re-check a channel block with one page instead of one request per post', async () => {
        seedChannel('channel1', 10);
        enqueueInChannel(['p3', 'p4', 'p5', 'p6', 'p7']);
        await flushAll();

        // Anchored on the post just newer than the newest queued one, so the block starts at p3.
        expect(revalidatePostsBefore).toHaveBeenCalledTimes(1);
        expect(revalidatePostsBefore).toHaveBeenCalledWith(serverUrl, 'channel1', 'p2');
        expect(fetchPostById).not.toHaveBeenCalled();
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.succeeded).toBe(5);
    });

    it('should page further back for posts older than the returned block', async () => {
        pageSize = 2;
        seedChannel('channel1', 10);
        enqueueInChannel(['p3', 'p4', 'p5', 'p6', 'p7']);
        await flushAll();

        expect(jest.mocked(revalidatePostsBefore).mock.calls.map((c) => c[2])).toEqual(['p2', 'p4', 'p6']);
        expect(fetchPostById).not.toHaveBeenCalled();
    });

    it('should fetch a post on its own when the page covered its range but did not return it', async () => {
        // Deleted or moved server-side: another page would not return it either.
        seedChannel('channel1', 10);
        jest.mocked(revalidatePostsBefore).mockImplementation(async (url, channelId, anchorId) => {
            const result = await serverPage(url, channelId, anchorId);
            store.p5.redactionVerifiedEpoch = 0;
            return result;
        });
        enqueueInChannel(['p3', 'p4', 'p5']);
        await flushAll();

        expect(revalidatePostsBefore).toHaveBeenCalledTimes(1);
        expect(fetchPostById).toHaveBeenCalledTimes(1);
        expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'p5', false, undefined, true);
    });

    it('should not page the anchored post again when the page never reached it', async () => {
        // The server holds posts between p3 and its anchor that the client does not, so the block
        // ends before p3; repeating the same anchor would loop forever.
        seedChannel('channel1', 10);

        // A repeat of the same page errors instead of answering, so a regression fails the count
        // below rather than looping until the test runner runs out of memory.
        let calls = 0;
        jest.mocked(revalidatePostsBefore).mockImplementation(async () => {
            calls += 1;
            return calls === 1 ? {oldestCreateAt: 998} : {error: new Error('repeated page')};
        });
        enqueueInChannel(['p3']);
        await flushAll();

        expect(revalidatePostsBefore).toHaveBeenCalledTimes(1);
        expect(fetchPostById).toHaveBeenCalledTimes(1);
        expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'p3', false, undefined, true);
    });

    it('should page each channel separately', async () => {
        seedChannel('channel1', 5, 'a');
        seedChannel('channel2', 5, 'b');
        enqueueInChannel(['a2', 'b2']);
        await flushAll();

        expect(jest.mocked(revalidatePostsBefore).mock.calls.map((c) => [c[1], c[2]]).sort()).toEqual([['channel1', 'a1'], ['channel2', 'b1']]);
        expect(fetchPostById).not.toHaveBeenCalled();
    });

    it('should fail every post of a failed page without retrying on its own', async () => {
        seedChannel('channel1', 10);
        jest.mocked(revalidatePostsBefore).mockResolvedValue({error: new Error('offline')});
        enqueueInChannel(['p3', 'p4', 'p5']);
        await flushAll();

        expect(revalidatePostsBefore).toHaveBeenCalledTimes(1);
        expect(fetchPostById).not.toHaveBeenCalled();
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.failed).toBe(3);
    });

    it('should discard queued channel posts whose requirement moved on', async () => {
        seedChannel('channel1', 10);
        jest.mocked(getRequiredRedactionEpoch).mockResolvedValue(5);
        enqueueInChannel(['p3', 'p4']);
        await flushAll();

        expect(revalidatePostsBefore).not.toHaveBeenCalled();
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.discardedStale).toBe(2);
    });

    it('should not touch a new session when logout lands mid-page', async () => {
        seedChannel('channel1', 10);
        let resolve: (value: {error: unknown}) => void = () => undefined;
        jest.mocked(revalidatePostsBefore).mockImplementationOnce(() => new Promise((r) => {
            resolve = r;
        }));
        enqueueInChannel(['p3']);
        await flushQueue();

        RedactionRevalidationManager.removeServer(serverUrl);
        const failed: boolean[] = [];
        const subscription = RedactionRevalidationManager.observeRevalidationFailed(serverUrl, 'p3').subscribe((f) => failed.push(f));
        RedactionRevalidationManager.enqueue(serverUrl, 'other', 1);
        resolve({error: new Error('late')});
        await flushAll();

        // The late failure belongs to the old session: no failure count, no retry shown for p3.
        expect(RedactionRevalidationManager.getMetrics(serverUrl)?.failed).toBe(0);
        expect(failed).toEqual([false]);
        subscription.unsubscribe();
    });
});
