// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRequiredRedactionEpoch} from '@actions/local/redaction';
import {fetchPostById} from '@actions/remote/post';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import RedactionRevalidationManager from './redaction_revalidation_manager';

jest.mock('@actions/remote/post', () => ({
    fetchPostById: jest.fn(() => Promise.resolve({post: {}})),
}));
jest.mock('@actions/local/redaction', () => ({
    getRequiredRedactionEpoch: jest.fn(() => Promise.resolve(1)),
}));
jest.mock('@queries/servers/post', () => ({
    getPostById: jest.fn(() => Promise.resolve(undefined)),
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
