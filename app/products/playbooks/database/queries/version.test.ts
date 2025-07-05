// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@playbooks/constants/version';

import {observeIsPlaybooksEnabled} from './version';

import type ServerDataOperator from '@database/operator/server_data_operator';

const MINIMUM_VERSION = `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;

describe('Playbook Version Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['version.test.com']);
        operator = DatabaseManager.serverDatabases['version.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('version.test.com');
    });

    describe('observeIsPlaybooksEnabled', () => {
        it('should return false when no playbooks version is set', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it(`should return true when playbooks version meets minimum requirements (${MINIMUM_VERSION})`, async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: MINIMUM_VERSION}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should return true when playbooks version has higher major version', async () => {
            const subscriptionNext = jest.fn();
            const higherVersion = `${MINIMUM_MAJOR_VERSION + 1}.0.0`;
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: higherVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should return true when playbooks version has higher minor version', async () => {
            const subscriptionNext = jest.fn();
            const higherVersion = `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION + 1}.${MINIMUM_PATCH_VERSION}`;
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: higherVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should return true when playbooks version has higher patch version', async () => {
            const subscriptionNext = jest.fn();
            const higherVersion = `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION + 1}`;
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: higherVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should handle empty version string', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: ''}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it('should react to version changes', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsPlaybooksEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            // Subscription always returns the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            const aboveVersion = `${MINIMUM_MAJOR_VERSION + 1}.${MINIMUM_MINOR_VERSION + 1}.${MINIMUM_PATCH_VERSION + 1}`;
            const belowVersion = `${MINIMUM_MAJOR_VERSION - 1}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;

            // Update the version
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: aboveVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
            subscriptionNext.mockClear();

            // Update to a lower version
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: belowVersion}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });
    });
});
