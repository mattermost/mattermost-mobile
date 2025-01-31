// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {createTestDatabase} from '@test/test.database';
import {addPreferencesToServer} from '@test/preferences.test';

import ScheduledPostIndicator from './';

describe('components/scheduled_post_indicator', () => {
    let database: Database;

    beforeAll(async () => {
        database = await createTestDatabase();
    });

    it('should render single scheduled post indicator correctly', async () => {
        const {getByTestId, getByText} = render(
            <ScheduledPostIndicator
                database={database}
                isThread={false}
            />,
        );

        await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(getByText(/Message scheduled for/)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('should render multiple scheduled posts indicator for channel', async () => {
        const {getByText} = render(
            <ScheduledPostIndicator
                database={database}
                isThread={false}
            />,
        );

        expect(getByText(/125 scheduled messages in channel./)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('should render multiple scheduled posts indicator for thread', async () => {
        const {getByText} = render(
            <ScheduledPostIndicator
                database={database}
                isThread={true}
            />,
        );

        expect(getByText(/125 scheduled messages in thread./)).toBeTruthy();
        expect(getByText(/See all./)).toBeTruthy();
    });

    it('renders with military time when preference is set', async () => {
        await addPreferencesToServer(database, [{
            category: Preferences.CATEGORY_DISPLAY_SETTINGS,
            name: 'use_military_time',
            value: 'true',
        }]);

        const {getByTestId} = render(
            <ScheduledPostIndicator
                database={database}
            />,
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });

    it('renders with 12-hour time when preference is not set', async () => {
        await addPreferencesToServer(database, [{
            category: Preferences.CATEGORY_DISPLAY_SETTINGS,
            name: 'use_military_time',
            value: 'false',
        }]);

        const {getByTestId} = render(
            <ScheduledPostIndicator
                database={database}
            />,
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });

    it('handles missing current user', async () => {
        const {getByTestId} = render(
            <ScheduledPostIndicator
                database={database}
            />,
        );

        const timeElement = await screen.findByTestId('scheduled_post_indicator_single_time');
        expect(timeElement).toBeTruthy();
    });
});
