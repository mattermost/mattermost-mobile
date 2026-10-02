// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {SKU_SHORT_NAME} from '@constants/license';
import DatabaseManager from '@database/manager';

import {observeIsAgentsAnalysisLicensed} from './license';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('observeIsAgentsAnalysisLicensed', () => {
    const serverUrl = 'agents-license.test.com';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await setPluginVersion('2.9.0');
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const setLicense = (value: Partial<ClientLicense>) => {
        return operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value}],
            prepareRecordsOnly: false,
        });
    };

    const setPluginVersion = (value: string) => {
        return operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.AGENTS_VERSION, value}],
            prepareRecordsOnly: false,
        });
    };

    const setConfigs = (configs: IdValue[]) => {
        return operator.handleConfigs({
            configs,
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    };

    const subscribe = () => {
        const subscriptionNext = jest.fn();
        observeIsAgentsAnalysisLicensed(operator.database).subscribe({next: subscriptionNext});
        return subscriptionNext;
    };

    it('should emit true for a Professional SKU, the lowest tier that allows analysis', async () => {
        await setLicense({SkuShortName: 'professional', LDAP: 'false'});
        expect(subscribe()).toHaveBeenCalledWith(true);
    });

    it.each([
        SKU_SHORT_NAME.E10,
        SKU_SHORT_NAME.E20,
        SKU_SHORT_NAME.Enterprise,
        SKU_SHORT_NAME.Entry,
        SKU_SHORT_NAME.EnterpriseAdvanced,
    ])('should emit true for the %s SKU from plugin 2.8.0 without the LDAP fallback', async (sku) => {
        await setPluginVersion('2.8.0');
        await setLicense({SkuShortName: sku, LDAP: 'false'});
        expect(subscribe()).toHaveBeenCalledWith(true);
    });

    it('should emit false for a starter or unlicensed server', async () => {
        await setLicense({IsLicensed: 'false', SkuShortName: 'starter', LDAP: 'false'});
        expect(subscribe()).toHaveBeenCalledWith(false);
    });

    it('should emit true for an unrecognised SKU carrying the LDAP feature (Professional fallback)', async () => {
        await setLicense({SkuShortName: 'custom', LDAP: 'true'});
        expect(subscribe()).toHaveBeenCalledWith(true);
    });

    it('should emit true in developer mode (EnableDeveloper + EnableTesting) without a license', async () => {
        await setConfigs([
            {id: 'EnableDeveloper', value: 'true'},
            {id: 'EnableTesting', value: 'true'},
        ]);
        expect(subscribe()).toHaveBeenCalledWith(true);
    });

    it('should emit false when unlicensed and only one developer-mode flag is set', async () => {
        await setConfigs([{id: 'EnableDeveloper', value: 'true'}]);
        expect(subscribe()).toHaveBeenCalledWith(false);
    });

    describe('with a plugin older than 2.8.0', () => {
        beforeEach(async () => {
            await setPluginVersion('2.7.0');
        });

        it('should emit false for a Professional SKU', async () => {
            await setLicense({SkuShortName: 'professional', LDAP: 'true'});
            expect(subscribe()).toHaveBeenCalledWith(false);
        });

        it('should emit false for a legacy E20 SKU, which the pre-tier-chart check did not accept', async () => {
            await setLicense({SkuShortName: SKU_SHORT_NAME.E20, LDAP: 'true'});
            expect(subscribe()).toHaveBeenCalledWith(false);
        });

        it('should emit true for an Enterprise SKU', async () => {
            await setLicense({SkuShortName: 'enterprise', LDAP: 'true'});
            expect(subscribe()).toHaveBeenCalledWith(true);
        });

        it('should still emit true in developer mode', async () => {
            await setConfigs([
                {id: 'EnableDeveloper', value: 'true'},
                {id: 'EnableTesting', value: 'true'},
            ]);
            expect(subscribe()).toHaveBeenCalledWith(true);
        });
    });
});
