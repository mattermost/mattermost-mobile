// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {switchToGlobalDrafts} from '@actions/local/draft';
import {Events} from '@constants';
import {DRAFT} from '@constants/screens';
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
        expect(getByText(/Message scheduled for/)).toBeVisible();
        expect(getByText(/See all./)).toBeVisible();
    });

    it('should render multiple scheduled posts indicator for channel', async () => {
        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                isThread={false}
                scheduledPostCount={10}
            />,
            {database},
        );

        expect(getByText(/10 scheduled messages in channel./)).toBeVisible();
        expect(getByText(/See all./)).toBeVisible();
    });

    it('should render multiple scheduled posts indicator for thread', async () => {
        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                isThread={true}
                scheduledPostCount={10}
            />,
            {database},
        );

        expect(getByText(/10 scheduled messages in thread./)).toBeVisible();
        expect(getByText(/See all./)).toBeVisible();
    });

    it('renders with military time when preference is set', async () => {
        await operator.handlePreferences({
            preferences: [
                {
                    user_id: 'user_1',
                    category: 'display_settings',
                    name: 'use_military_time',
                    value: 'true',
                },
            ],
            prepareRecordsOnly: false,
        });

        const {getByText, findByTestId} = renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeVisible();

        expect(getByText(/19:41/)).toBeVisible();
    });

    it('renders with 12-hour time when preference is set to 12 hours', async () => {
        await operator.handlePreferences({
            preferences: [
                {
                    user_id: 'user_1',
                    category: 'display_settings',
                    name: 'use_military_time',
                    value: 'false',
                },
            ],
            prepareRecordsOnly: false,
        });

        const {getByText, findByTestId} = renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeVisible();

        expect(getByText(/7:41 PM/)).toBeVisible();
    });

    it('renders with 12-hour time when preference is not set', async () => {
        const {getByText, findByTestId} = renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeVisible();

        expect(getByText(/7:41 PM/)).toBeVisible();
    });

    it('handles missing current user', async () => {
        const {getByText, findByTestId} = renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const timeElement = await findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeVisible();
        expect(getByText(/Message scheduled for/)).toBeVisible();
    });

    it('handles See all link press correctly', async () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
        const switchToGlobalDraftsSpy = jest.spyOn(require('@actions/local/draft'), 'switchToGlobalDrafts');

        const {getByText} = renderWithEverything(
            <ScheduledPostIndicator
                scheduledPostCount={1}
            />,
            {database},
        );

        const seeAllLink = getByText('See all.');
        fireEvent.press(seeAllLink);

        expect(emitSpy).toHaveBeenCalledWith(Events.ACTIVE_SCREEN, DRAFT);
        expect(switchToGlobalDraftsSpy).toHaveBeenCalledWith(1);

        emitSpy.mockRestore();
        switchToGlobalDraftsSpy.mockRestore();
    });
});
