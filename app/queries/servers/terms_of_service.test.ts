// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeShowToS} from './terms_of_service';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type UserModel from '@typings/database/models/servers/user';

const DAY_MS = 24 * 60 * 60 * 1000;
const {SERVER: {USER}} = MM_TABLES;

describe('observeShowToS', () => {
    const serverUrl = 'http://tos.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const setConfig = (configs: Array<{id: string; value: string}>) =>
        operator.handleConfigs({configs, configsToDelete: [], prepareRecordsOnly: false});

    const setLicense = (isLicensed: string) =>
        operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: isLicensed}}],
            prepareRecordsOnly: false,
        });

    const setCurrentUserTos = async (tosId: string, tosCreateAt: number) => {
        const userId = TestHelper.basicUser!.id;
        await database.write(async () => {
            const user = await database.get<UserModel>(USER).find(userId);
            await user.update((u) => {
                u.termsOfServiceId = tosId;
                u.termsOfServiceCreateAt = tosCreateAt;
            });
        });
    };

    it('should emit false when not licensed', async () => {
        await setConfig([
            {id: 'EnableCustomTermsOfService', value: 'true'},
            {id: 'CustomTermsOfServiceId', value: 'tos1'},
            {id: 'CustomTermsOfServiceReAcceptancePeriod', value: '365'},
        ]);

        const show = await firstValueFrom(observeShowToS(database));
        expect(show).toBe(false);
    });

    it('should emit false when custom ToS is disabled', async () => {
        await setLicense('true');
        await setConfig([
            {id: 'EnableCustomTermsOfService', value: 'false'},
            {id: 'CustomTermsOfServiceId', value: 'tos1'},
            {id: 'CustomTermsOfServiceReAcceptancePeriod', value: '365'},
        ]);

        const show = await firstValueFrom(observeShowToS(database));
        expect(show).toBe(false);
    });

    it('should emit true when user has not accepted current ToS version', async () => {
        await setCurrentUserTos('tos-old', Date.now());
        await setLicense('true');
        await setConfig([
            {id: 'EnableCustomTermsOfService', value: 'true'},
            {id: 'CustomTermsOfServiceId', value: 'tos-new'},
            {id: 'CustomTermsOfServiceReAcceptancePeriod', value: '365'},
        ]);

        const show = await firstValueFrom(observeShowToS(database));
        expect(show).toBe(true);
    });

    it('should emit false when user accepted current ToS within the acceptance period', async () => {
        const tosId = 'tos-current';
        const acceptedAt = Date.now() - (10 * DAY_MS); // 10 days ago, period is 30 days

        await setCurrentUserTos(tosId, acceptedAt);
        await setLicense('true');
        await setConfig([
            {id: 'EnableCustomTermsOfService', value: 'true'},
            {id: 'CustomTermsOfServiceId', value: tosId},
            {id: 'CustomTermsOfServiceReAcceptancePeriod', value: '30'},
        ]);

        const show = await firstValueFrom(observeShowToS(database));
        expect(show).toBe(false);
    });

    it('should emit true when acceptance period has elapsed', async () => {
        const tosId = 'tos-current';
        const acceptedAt = Date.now() - (40 * DAY_MS); // 40 days ago, period is 30 days

        await setCurrentUserTos(tosId, acceptedAt);
        await setLicense('true');
        await setConfig([
            {id: 'EnableCustomTermsOfService', value: 'true'},
            {id: 'CustomTermsOfServiceId', value: tosId},
            {id: 'CustomTermsOfServiceReAcceptancePeriod', value: '30'},
        ]);

        const show = await firstValueFrom(observeShowToS(database));
        expect(show).toBe(true);
    });
});
