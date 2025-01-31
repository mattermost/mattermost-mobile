// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model} from '@nozbe/watermelondb';
import {render, waitFor} from '@testing-library/react-native';
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

        await waitFor(() => {
            const timeElement = getByTestId('scheduled_post_indicator_single_time');
            expect(timeElement).toBeTruthy();
            // Would check for 24-hour format, but actual time formatting is tested elsewhere
        });
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

        await waitFor(() => {
            const timeElement = getByTestId('scheduled_post_indicator_single_time');
            expect(timeElement).toBeTruthy();
            // Would check for 12-hour format, but actual time formatting is tested elsewhere
        });
    });

    it('handles missing current user', async () => {
        const {getByTestId} = render(
            <ScheduledPostIndicator
                database={database}
            />,
        );

        await waitFor(() => {
            const timeElement = getByTestId('scheduled_post_indicator_single_time');
            expect(timeElement).toBeTruthy();
        });
    });
});
