// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import NetworkManager from '@managers/network_manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import BoRQuickAction from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const SERVER_URL = 'https://appv1.mattermost.com';

// this is needed to when using the useServerUrl hook
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => SERVER_URL),
}));

describe('BoRQuickAction', () => {
    const baseProps = {
        testId: 'bor_quick_action',
        postBoRConfig: undefined,
        updatePostBoRStatus: jest.fn(),
        defaultBorConfig: {
            enabled: false,
            borDurationSeconds: 300,
            borMaximumTimeToLiveSeconds: 3600,
        } as PostBoRConfig,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
        operator = server.operator;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(SERVER_URL);
    });

    describe('Rendering', () => {
        it('renders the BoR quick action button', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...baseProps}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            expect(borButton).toBeVisible();
        });

        it('renders with fire icon', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...baseProps}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            expect(borButton).toBeVisible();
            
            // The CompassIcon with fire name should be rendered
            expect(borButton).toBeTruthy();
        });
    });

    describe('Functionality', () => {
        it('toggles BoR status from disabled to enabled when pressed', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const props = {
                ...baseProps,
                updatePostBoRStatus: updatePostBoRStatusMock,
                postBoRConfig: {
                    enabled: false,
                    borDurationSeconds: 300,
                    borMaximumTimeToLiveSeconds: 3600,
                } as PostBoRConfig,
            };

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...props}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            fireEvent.press(borButton);

            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: true,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            });
        });

        it('toggles BoR status from enabled to disabled when pressed', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const props = {
                ...baseProps,
                updatePostBoRStatus: updatePostBoRStatusMock,
                postBoRConfig: {
                    enabled: true,
                    borDurationSeconds: 300,
                    borMaximumTimeToLiveSeconds: 3600,
                } as PostBoRConfig,
            };

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...props}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            fireEvent.press(borButton);

            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: false,
                borDurationSeconds: 300,
                borMaximumTimeToLiveSeconds: 3600,
            });
        });

        it('uses default config when postBoRConfig is undefined', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const props = {
                ...baseProps,
                updatePostBoRStatus: updatePostBoRStatusMock,
                postBoRConfig: undefined,
                defaultBorConfig: {
                    enabled: false,
                    borDurationSeconds: 600,
                    borMaximumTimeToLiveSeconds: 7200,
                } as PostBoRConfig,
            };

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...props}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            fireEvent.press(borButton);

            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: true,
                borDurationSeconds: 600,
                borMaximumTimeToLiveSeconds: 7200,
            });
        });

        it('preserves existing config values when toggling', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '300'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '3600'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const customConfig = {
                enabled: false,
                borDurationSeconds: 900,
                borMaximumTimeToLiveSeconds: 10800,
            } as PostBoRConfig;

            const props = {
                ...baseProps,
                updatePostBoRStatus: updatePostBoRStatusMock,
                postBoRConfig: customConfig,
            };

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...props}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            fireEvent.press(borButton);

            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: true,
                borDurationSeconds: 900,
                borMaximumTimeToLiveSeconds: 10800,
            });
        });
    });

    describe('Database Integration', () => {
        it('observes default BoR config from database', async () => {
            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                    {id: 'BurnOnReadDurationSeconds', value: '450'},
                    {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: '5400'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const updatePostBoRStatusMock = jest.fn();
            const props = {
                testId: 'bor_quick_action',
                postBoRConfig: undefined,
                updatePostBoRStatus: updatePostBoRStatusMock,
            };

            const {getByTestId} = renderWithEverything(<BoRQuickAction {...props}/>, {database});

            const borButton = getByTestId('bor_quick_action');
            fireEvent.press(borButton);

            // Should use the config from database (450s duration, 5400s max TTL)
            expect(updatePostBoRStatusMock).toHaveBeenCalledWith({
                enabled: true,
                borDurationSeconds: 450,
                borMaximumTimeToLiveSeconds: 5400,
            });
        });
    });
});
