// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Database, Model} from '@nozbe/watermelondb';
import {act, fireEvent} from '@testing-library/react-native';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import GlobalDraftsAndScheduledPosts from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@mattermost/rnutils', () => ({
    getWindowDimensions: jest.fn(() => ({width: 800, height: 600})),
}));

describe('screens/global_drafts', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        operator = server.operator;

        await operator.handleConfigs({
            configs: [
                {id: 'ScheduledPosts', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    it('should match snapshot', () => {
        const {toJSON} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );
        expect(toJSON()).toMatchSnapshot();
    });

    it('should render drafts list when scheduled posts is disabled', () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        expect(getByTestId('global_drafts.screen')).toBeTruthy();
        expect(queryByTestId('draft_tab_container')).toBeFalsy();
    });

    it('should render tabs when scheduled posts is enabled', async () => {
        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        expect(getByTestId('draft_tab_container')).toBeTruthy();
        expect(getByTestId('draft_tab')).toBeTruthy();
        expect(getByTestId('scheduled_post_tab')).toBeTruthy();
    });

    it('should switch between tabs', async () => {
        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        const draftTab = getByTestId('draft_tab');
        const scheduledTab = getByTestId('scheduled_post_tab');

        // Initially drafts list should be visible
        expect(getByTestId('draft_list_container')).toBeTruthy();

        // Switch to scheduled posts
        act(() => {
            fireEvent.press(scheduledTab);
        });

        // Scheduled posts list should now be visible
        expect(getByTestId('scheduled_posts_list_container')).toBeTruthy();

        // Switch back to drafts
        act(() => {
            fireEvent.press(draftTab);
        });

        // Drafts list should be visible again
        expect(getByTestId('draft_list_container')).toBeTruthy();
    });
});
