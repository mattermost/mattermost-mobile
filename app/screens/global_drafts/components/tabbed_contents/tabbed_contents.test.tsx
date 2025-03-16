// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {DRAFT_SCREEN_TAB_DRAFTS} from '@screens/global_drafts';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import TabbedContents from './tabbed_contents';

jest.mock('react-freeze', () => ({
    Freeze: jest.fn(({children}) => children),
}));

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    return {
        ...Reanimated,
        default: {
            ...Reanimated.default,
            useAnimatedStyle: () => ({}),
            withTiming: (value: any) => value,
        },
    };
});

jest.mock('@hooks/device', () => ({
    useWindowDimensions: jest.fn(() => ({
        width: 375,
        height: 667,
    })),
}));

describe('TabbedContents', () => {
    const mockDraftsContent = <Text testID='drafts-content'>{'Drafts Content'}</Text>;
    const mockScheduledPostsContent = <Text testID='scheduled-posts-content'>{'Scheduled Posts Content'}</Text>;

    const defaultProps: Parameters<typeof TabbedContents>[0] = {
        draftsCount: 5,
        scheduledPostCount: 3,
        initialTab: DRAFT_SCREEN_TAB_DRAFTS,
        drafts: mockDraftsContent,
        scheduledPosts: mockScheduledPostsContent,
    };

    it('renders correctly with initial tab set to drafts', () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        // Check that the drafts tab is selected
        expect(screen.getByTestId('draft_tab')).toBeTruthy();
        expect(screen.getByTestId('drafts-content')).toBeTruthy();

        // Check that the counts are displayed correctly
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('switches tabs when clicked', async () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        expect(screen.getByTestId('draft_tab')).toBeTruthy();

        await act(async () => {
            fireEvent.press(screen.getByTestId('scheduled_post_tab'));
        });

        expect(screen.getByTestId('scheduled-posts-content')).toBeTruthy();
        expect(screen.queryByTestId('drafts-content')).toBeNull();

        await act(async () => {
            fireEvent.press(screen.getByTestId('draft_tab'));
        });

        expect(screen.getByTestId('drafts-content')).toBeTruthy();
        expect(screen.queryByTestId('scheduled-posts-content')).toBeNull();
    });

    it('displays zero counts correctly', () => {
        renderWithIntlAndTheme(
            <TabbedContents
                {...defaultProps}
                draftsCount={0}
                scheduledPostCount={0}
            />,
        );

        // Check that zero counts are displayed
        expect(screen.getAllByText('0')).toHaveLength(2);
    });

    it('renders both content sections', async () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        // Check that drafts content is in the DOM
        expect(screen.getByTestId('drafts-content')).toBeTruthy();
        expect(screen.queryByTestId('scheduled-posts-content')).toBeNull();

        // Click on scheduled posts tab to make that content visible
        await act(async () => {
            fireEvent.press(screen.getByTestId('scheduled_post_tab'));
        });

        // Now the scheduled posts content should be visible
        expect(screen.getByTestId('scheduled-posts-content')).toBeTruthy();
        expect(screen.queryByTestId('drafts-content')).toBeNull();
    });
});
