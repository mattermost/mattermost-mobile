import {Database} from '@nozbe/watermelondb';
import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';

import GlobalDraftsAndScheduledPosts from '../index';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@queries/servers/system', () => ({
    observeConfigBooleanValue: jest.fn(),
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn().mockReturnValue(50),
}));

jest.mock('@screens/navigation', () => ({
    popTopScreen: jest.fn(),
}));

describe('GlobalDraftsAndScheduledPosts', () => {
    const baseProps = {
        componentId: Screens.GLOBAL_DRAFTS,
        database: {} as Database,
    };

    it('renders only drafts list when scheduled posts are disabled', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: false,
        };

        const {queryByText, getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
        );

        // Verify tabs are not present
        expect(queryByText('Drafts')).toBeNull();
        expect(queryByText('Scheduled')).toBeNull();

        // Verify drafts list is rendered
        expect(getByTestId('global_drafts_list')).toBeVisible();
    });

    it('renders tabs when scheduled posts are enabled', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: true,
        };

        const {getByText, getByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
        );

        // Verify both tabs are present
        expect(getByText('Drafts')).toBeVisible();
        expect(getByText('Scheduled')).toBeVisible();

        // Verify drafts list is rendered initially
        expect(getByTestId('global_drafts_list')).toBeVisible();
    });

    it('switches between tabs correctly', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: true,
        };

        const {getByText, getByTestId, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
        );

        // Initially on drafts tab
        expect(getByTestId('global_drafts_list')).toBeVisible();

        // Switch to scheduled tab
        fireEvent.press(getByText('Scheduled'));
        
        // Verify scheduled content is shown and drafts list is hidden
        expect(queryByTestId('global_drafts_list')).toBeNull();
        expect(getByText('Favorite')).toBeVisible(); // Temporary text until scheduled list is implemented
    });

    it('renders with initial tab selection', () => {
        const props = {
            ...baseProps,
            scheduledPostsEnabled: true,
            initialTab: 1, // SCHEDULED_POSTS_TAB
        };

        const {getByText, queryByTestId} = renderWithEverything(
            <GlobalDraftsAndScheduledPosts {...props}/>,
        );

        // Verify we start on scheduled tab
        expect(queryByTestId('global_drafts_list')).toBeNull();
        expect(getByText('Favorite')).toBeVisible();
    });
});
