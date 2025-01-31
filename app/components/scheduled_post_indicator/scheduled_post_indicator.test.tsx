// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {screen} from '@testing-library/react-native';
import React from 'react';

import NetworkManager from '@managers/network_manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ScheduledPostIndicator from './';

import type ServerDataOperator from '@database/operator/server_data_operator';

const SERVER_URL = 'https://appv1.mattermost.com';

// this is needed when using the useServerUrl hook
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => SERVER_URL),
}));

describe('components/scheduled_post_indicator', () => {
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

    it('should render single scheduled post indicator correctly', async () => {
        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                isThread={false}
                scheduledPostCount={1}
            />,
            {database},
        );

        await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(getByText(/Message scheduled for/)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('should render multiple scheduled posts indicator for channel', async () => {
        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                isThread={false}
                scheduledPostCount={10}
            />,
            {database},
        );

        expect(getByText(/10 scheduled messages in channel./)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('should render multiple scheduled posts indicator for thread', async () => {
        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                isThread={true}
                scheduledPostCount={10}
            />,
            {database},
        );

        expect(getByText(/10 scheduled messages in thread./)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('renders with military time when preference is set', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'use_military_time', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });

    it('renders with 12-hour time when preference is not set', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'use_military_time', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });

    it('handles missing current user', async () => {
        renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });
});
