// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import GlobalDraftsAndScheduledPosts from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@hooks/device', () => ({
    useWindowDimensions: jest.fn(() => ({width: 800, height: 600})),
    useIsTablet: jest.fn().mockReturnValue(false),
}));

describe('screens/global_drafts', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        operator = server.operator;
    });

    beforeEach(async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'ScheduledPosts', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    it('should render drafts list when scheduled posts is disabled', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'ScheduledPosts', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        expect(getByTestId('global_drafts.screen')).toBeVisible();
        expect(queryByTestId('draft_tab_container')).not.toBeVisible();
    });

    it('should render tabs when scheduled posts is enabled', async () => {
        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        expect(getByTestId('draft_tab_container')).toBeVisible();
        expect(getByTestId('draft_tab')).toBeVisible();
        expect(getByTestId('scheduled_post_tab')).toBeVisible();
    });

    it('should switch between tabs', async () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        const draftTab = getByTestId('draft_tab');
        const scheduledTab = getByTestId('scheduled_post_tab');

        // Initially drafts list should be visible
        expect(getByTestId('draft_list_container')).toBeVisible();

        // And scheduled posts tab should not be visible
        expect(queryByTestId('scheduled_posts_list_container')).not.toBeVisible();

        // Switch to scheduled posts
        act(() => {
            fireEvent.press(scheduledTab);
        });

        // Scheduled posts list should now be visible
        expect(getByTestId('scheduled_posts_list_container')).toBeVisible();

        // And draft tab not be visible
        expect(queryByTestId('draft_list_container')).not.toBeVisible();

        // Switch back to drafts
        act(() => {
            fireEvent.press(draftTab);
        });

        // Drafts list should be visible again
        expect(getByTestId('draft_list_container')).toBeVisible();

        // And scheduled posts tab should not be visible again
        expect(queryByTestId('scheduled_posts_list_container')).not.toBeVisible();
    });
});
