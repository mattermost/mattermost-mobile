// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import DatabaseManager from '@database/manager';

import {observeLowConnectivityMonitor} from './global';

import type {AppDatabase} from '@typings/database/database';

jest.mock('@database/manager', () => ({
    getAppDatabaseAndOperator: jest.fn(),
}));

describe('observeLowConnectivityMonitor', () => {
    const mockDatabase = {
        get: jest.fn(),
    };

    const mockQuery = {
        query: jest.fn(),
        observe: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.getAppDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: {},
        } as unknown as AppDatabase);
    });

    it('should return observable that defaults to true when no database record exists', (done) => {
        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(true);
            done();
        });
    });

    it('should return observable with database value when record exists', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$({value: false})),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(false);
            done();
        });
    });

    it('should handle boolean value directly', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$(true)),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(true);
            done();
        });
    });

    it('should handle false boolean value directly', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$(false)),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(false);
            done();
        });
    });

    it('should default to true when record value is undefined', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$({value: undefined})),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(true);
            done();
        });
    });

    it('should default to true when query returns null', (done) => {
        jest.mocked(DatabaseManager.getAppDatabaseAndOperator).mockImplementation(() => {
            throw new Error('Database not found');
        });

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(true);
            done();
        });
    });

    it('should handle enabled state (true)', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$({value: true})),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(true);
            done();
        });
    });

    it('should handle disabled state (false)', (done) => {
        const mockRecord = {
            observe: jest.fn().mockReturnValue(of$({value: false})),
        };

        mockDatabase.get.mockReturnValue({
            query: jest.fn().mockReturnValue(mockQuery),
        });
        mockQuery.observe.mockReturnValue(of$([mockRecord]));

        const observable = observeLowConnectivityMonitor();

        observable.subscribe((value) => {
            expect(value).toBe(false);
            done();
        });
    });
});

