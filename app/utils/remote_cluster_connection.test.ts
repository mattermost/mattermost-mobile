// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {toMilliseconds} from './datetime';
import {
    isRemoteClusterConfirmed,
    isRemoteClusterConnected,
    getRemoteClusterConnectionStatus,
    getConnectionStatus,
    type WorkspaceWithStatus,
} from './remote_cluster_connection';

const CONNECTED_PING_THRESHOLD_MS = toMilliseconds({minutes: 5});

describe('remote_cluster_connection', () => {
    describe('isRemoteClusterConfirmed', () => {
        it('should return true when site_url is set and does not start with pending_', () => {
            expect(isRemoteClusterConfirmed({site_url: 'https://example.com', last_ping_at: 0})).toBe(true);
            expect(isRemoteClusterConfirmed({site_url: 'https://remote.server', last_ping_at: 1})).toBe(true);
        });

        it('should return false when site_url is undefined', () => {
            expect(isRemoteClusterConfirmed({last_ping_at: 0})).toBe(false);
        });

        it('should return false when site_url is empty', () => {
            expect(isRemoteClusterConfirmed({site_url: '', last_ping_at: 0})).toBe(false);
        });

        it('should return false when site_url starts with pending_', () => {
            expect(isRemoteClusterConfirmed({site_url: 'pending_abc', last_ping_at: 0})).toBe(false);
            expect(isRemoteClusterConfirmed({site_url: 'pending_', last_ping_at: 0})).toBe(false);
        });
    });

    describe('isRemoteClusterConnected', () => {
        beforeEach(() => {
            jest.useFakeTimers({doNotFake: ['nextTick']});
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return false when last_ping_at is 0', () => {
            expect(isRemoteClusterConnected({site_url: 'https://x.com', last_ping_at: 0})).toBe(false);
        });

        it('should return true when last_ping_at is within the last 5 minutes', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            const lastPingAt = (now - CONNECTED_PING_THRESHOLD_MS) + 1000;
            expect(isRemoteClusterConnected({site_url: 'https://x.com', last_ping_at: lastPingAt})).toBe(true);
        });

        it('should return false when last_ping_at is older than 5 minutes', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            const lastPingAt = now - CONNECTED_PING_THRESHOLD_MS - 1000;
            expect(isRemoteClusterConnected({site_url: 'https://x.com', last_ping_at: lastPingAt})).toBe(false);
        });

        it('should return true when last_ping_at is exactly at the threshold', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            const lastPingAt = now - CONNECTED_PING_THRESHOLD_MS;
            expect(isRemoteClusterConnected({site_url: 'https://x.com', last_ping_at: lastPingAt})).toBe(true);
        });
    });

    describe('getRemoteClusterConnectionStatus', () => {
        beforeEach(() => {
            jest.useFakeTimers({doNotFake: ['nextTick']});
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return connection_pending when not confirmed', () => {
            expect(getRemoteClusterConnectionStatus({last_ping_at: 0})).toBe('connection_pending');
            expect(getRemoteClusterConnectionStatus({site_url: 'pending_x', last_ping_at: Date.now()})).toBe('connection_pending');
        });

        it('should return connected when confirmed and last_ping_at within threshold', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            const rc = TestHelper.fakeRemoteClusterInfo({site_url: 'https://x.com', last_ping_at: now - 1000});
            expect(getRemoteClusterConnectionStatus(rc)).toBe('connected');
        });

        it('should return offline when confirmed but last_ping_at older than threshold', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            const rc = TestHelper.fakeRemoteClusterInfo({site_url: 'https://x.com', last_ping_at: now - CONNECTED_PING_THRESHOLD_MS - 1});
            expect(getRemoteClusterConnectionStatus(rc)).toBe('offline');
        });
    });

    describe('getConnectionStatus', () => {
        beforeEach(() => {
            jest.useFakeTimers({doNotFake: ['nextTick']});
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return pending_save when pendingSave is true', () => {
            const w: WorkspaceWithStatus = {
                ...TestHelper.fakeRemoteClusterInfo({site_url: 'https://x.com', last_ping_at: Date.now()}),
                pendingSave: true,
            };
            expect(getConnectionStatus(w)).toBe('pending_save');
        });

        it('should delegate to getRemoteClusterConnectionStatus when pendingSave is not true', () => {
            const now = 1000000000000;
            jest.setSystemTime(now);
            expect(getConnectionStatus(
                TestHelper.fakeRemoteClusterInfo({site_url: 'https://x.com', last_ping_at: now - 1000}),
            )).toBe('connected');
            expect(getConnectionStatus({
                site_url: 'pending_',
                last_ping_at: 0,
                pendingSave: false,
            })).toBe('connection_pending');
        });
    });
});
