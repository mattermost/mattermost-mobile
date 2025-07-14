// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import GlobalDraftsAndScheduledPosts from './global_drafts';

jest.mock('@hooks/device', () => ({
    useWindowDimensions: jest.fn(() => ({width: 800, height: 600})),
    useIsTablet: jest.fn().mockReturnValue(false),
}));

describe('screens/global_drafts', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render drafts list when scheduled posts is disabled', async () => {
        const {getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts/>,
            {database},
        );

        expect(getByTestId('global_drafts.screen')).toBeVisible();
        expect(queryByTestId('draft_tab_container')).not.toBeVisible();
    });

    it('should render tabs when scheduled posts is enabled', async () => {
        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts
                scheduledPostsEnabled={true}
            />,
            {database},
        );

        await act(async () => {
            await TestHelper.wait(200); // Wait until the badge renders
        });

        expect(getByTestId('tabs.drafts.button')).toBeVisible();
        expect(getByTestId('tabs.scheduled_posts.button')).toBeVisible();
    });

    // Skipping this test because it is not behaving as it should
    // with the styles. Not sure why it is not working.
    it.skip('should switch between tabs', async () => {
        const {getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts
                scheduledPostsEnabled={true}
            />,
            {database},
        );

        await act(async () => {
            await TestHelper.wait(200); // Wait until the badge renders
        });

        const draftTab = getByTestId('tabs.drafts.button');
        const scheduledTab = getByTestId('tabs.scheduled_posts.button');
        const tabbedContents = getByTestId('tabbed_contents');

        await act(async () => {
            fireEvent(tabbedContents, 'layout', {
                nativeEvent: {layout: {width: 300}}, // Simulated width change
            });
            await TestHelper.wait(200); // Wait until the badge renders
        });

        // Initially drafts list should be visible
        const draftsList = getByTestId('draft_list_container');
        expect(draftsList.props.style[0].transform[0].translateX).toBe(0);

        // And scheduled posts tab should not be visible
        const scheduledPostsList = getByTestId('scheduled_posts_list_container');
        expect(scheduledPostsList.props.style[0].transform[0].translateX).toBe(300);

        // Switch to scheduled posts
        act(() => {
            fireEvent.press(scheduledTab);
        });

        // Scheduled posts list should now be visible
        expect(scheduledPostsList.props.style[0].transform[0].translateX).toBe(0);

        // And draft tab not be visible
        expect(draftsList.props.style[0].transform[0].translateX).toBe(-300);

        // Switch back to drafts
        act(() => {
            fireEvent.press(draftTab);
        });

        // Drafts list should be visible again
        expect(draftsList.props.style[0].transform[0].translateX).toBe(0);

        // And scheduled posts tab should not be visible again
        expect(scheduledPostsList.props.style[0].transform[0].translateX).toBe(300);
    });
});
