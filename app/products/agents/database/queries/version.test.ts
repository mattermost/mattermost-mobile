// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@agents/constants/version';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {fetchIsAgentsEnabled, observeIsAgentsEnabled} from './version';

import type ServerDataOperator from '@database/operator/server_data_operator';

const MINIMUM_VERSION = `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;

describe('Agents Version Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['agents-version.test.com']);
        operator = DatabaseManager.serverDatabases['agents-version.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('agents-version.test.com');
    });

    describe('observeIsAgentsEnabled', () => {
        it('should return false when no agents version is set', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsAgentsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it(`should return true when agents version meets minimum requirements (${MINIMUM_VERSION})`, async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsAgentsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: MINIMUM_VERSION}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should return true when agents version has higher major version', async () => {
            const subscriptionNext = jest.fn();
            const higherVersion = `${MINIMUM_MAJOR_VERSION + 1}.0.0`;
            const result = observeIsAgentsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: higherVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should handle empty version string', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsAgentsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: ''}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it('should react to version changes', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsAgentsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            const aboveVersion = `${MINIMUM_MAJOR_VERSION + 1}.${MINIMUM_MINOR_VERSION + 1}.${MINIMUM_PATCH_VERSION + 1}`;
            const belowVersion = `${MINIMUM_MAJOR_VERSION - 1}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: aboveVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: belowVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });
    });

    describe('fetchIsAgentsEnabled', () => {
        it('should return false when no agents version is set', async () => {
            const result = await fetchIsAgentsEnabled(operator.database);
            expect(result).toBe(false);
        });

        it(`should return true when agents version meets minimum requirements (${MINIMUM_VERSION})`, async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: MINIMUM_VERSION}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsAgentsEnabled(operator.database);
            expect(result).toBe(true);
        });

        it('should return true when agents version has higher major version', async () => {
            const higherVersion = `${MINIMUM_MAJOR_VERSION + 1}.0.0`;
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: higherVersion}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsAgentsEnabled(operator.database);
            expect(result).toBe(true);
        });

        it('should handle empty version string', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: ''}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsAgentsEnabled(operator.database);
            expect(result).toBe(false);
        });

        it('should return false when agents version is below minimum', async () => {
            const belowVersion = `${MINIMUM_MAJOR_VERSION - 1}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value: belowVersion}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsAgentsEnabled(operator.database);
            expect(result).toBe(false);
        });
    });
});
