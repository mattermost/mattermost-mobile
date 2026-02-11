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

    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(SERVER_URL);
        database = server.database;
        operator = server.operator;

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
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(SERVER_URL);
    });

    it('renders the BoR quick action button', async () => {
        const {getByTestId} = renderWithEverything(<BoRQuickAction {...baseProps}/>, {database});

        const borButton = getByTestId('bor_quick_action');
        expect(borButton).toBeVisible();
    });

    it('toggles BoR status from disabled to enabled when pressed', async () => {
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
        const updatePostBoRStatusMock = jest.fn();
        const props = {
            ...baseProps,
            updatePostBoRStatus: updatePostBoRStatusMock,
            postBoRConfig: undefined,
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
});
