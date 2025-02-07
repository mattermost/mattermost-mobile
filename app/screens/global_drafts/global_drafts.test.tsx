// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {act} from '@testing-library/react-hooks';
import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import GlobalDraftsAndScheduledPosts, {
    DRAFT_SCREEN_TAB_SCHEDULED_POSTS,
    type DraftScreenTab,
} from '@screens/global_drafts/index';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('GlobalDraftsAndScheduledPosts', () => {
    const baseProps = {
        componentId: Screens.GLOBAL_DRAFTS,
        database: {} as Database,
    };

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        // const server = await TestHelper.setupServerDatabase(SERVER_URL);

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

    it('renders only drafts list when scheduled posts are disabled', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'ScheduledPosts', value: 'false'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const props = {
            ...baseProps,
            scheduledPostsEnabled: false,
        };

        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
            {database},
        );

        // Verify tabs are not present
        expect(queryByTestId('drafts_tab')).toBeNull();
        expect(queryByTestId('scheduled_posts_tab')).toBeNull();

        // Verify drafts list is rendered
        expect(getByTestId('global_drafts_list')).toBeVisible();
    });

    it('renders tabs when scheduled posts are enabled', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: true,
        };

        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
            {database},
        );

        // Verify both tabs are present
        expect(getByTestId('drafts_tab')).toBeVisible();
        expect(getByTestId('scheduled_posts_tab')).toBeVisible();

        // Verify drafts list is rendered initially
        expect(getByTestId('global_drafts_list')).toBeVisible();
    });

    it('switches between tabs correctly', async () => {
        const props = {
            ...baseProps,
        };

        const {getByText, getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
            {database},
        );

        // Initially on drafts tab
        expect(getByTestId('global_drafts_list')).toBeVisible();

        // Switch to scheduled tab
        act(() => {
            fireEvent.press(getByText('Scheduled'));
        });

        // eslint-disable-next-line no-warning-comments
        // TODO: replace this with validating the actual component's presence

        // Temporary text until scheduled list is implemented
        expect(getByText('Favorite')).toBeVisible();

        // Verify scheduled content is shown and drafts list is hidden
        expect(queryByTestId('drafts_tab_content')).not.toBeVisible();
    });

    it('renders with initial tab selection', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: true,
            initialTab: DRAFT_SCREEN_TAB_SCHEDULED_POSTS as DraftScreenTab, // SCHEDULED_POSTS_TAB
        };

        const {getByText, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
            {database},
        );

        // Verify we start on scheduled tab
        expect(queryByTestId('scheduled_post_tab_content')).toBeVisible();
        expect(getByText('Favorite')).toBeVisible();
    });
});
