// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {fetchIsTaskRequirementsEnabled, observeIsTaskRequirementsEnabled} from './settings';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Playbook Settings Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['settings.test.com']);
        operator = DatabaseManager.serverDatabases['settings.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('settings.test.com');
    });

    describe('observeIsTaskRequirementsEnabled', () => {
        it('should return false when the setting is not present', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsTaskRequirementsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });

        it('should return true when the setting is enabled', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsTaskRequirementsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: true}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should react to setting changes', async () => {
            const subscriptionNext = jest.fn();
            const result = observeIsTaskRequirementsEnabled(operator.database);
            result.subscribe({next: subscriptionNext});

            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: true}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(true);
            subscriptionNext.mockClear();

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: false}],
                prepareRecordsOnly: false,
            });

            expect(subscriptionNext).toHaveBeenCalledWith(false);
        });
    });

    describe('fetchIsTaskRequirementsEnabled', () => {
        it('should return false when the setting is not present', async () => {
            const result = await fetchIsTaskRequirementsEnabled(operator.database);
            expect(result).toBe(false);
        });

        it('should return true when the setting is enabled', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: true}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsTaskRequirementsEnabled(operator.database);
            expect(result).toBe(true);
        });

        it('should return false when the setting is disabled', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: false}],
                prepareRecordsOnly: false,
            });

            const result = await fetchIsTaskRequirementsEnabled(operator.database);
            expect(result).toBe(false);
        });
    });
});
