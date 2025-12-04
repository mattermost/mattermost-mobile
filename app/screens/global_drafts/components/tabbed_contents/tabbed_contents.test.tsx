// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS} from '@constants/draft';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TabbedContents from './tabbed_contents';

jest.mock('react-freeze', () => ({
    Freeze: jest.fn(({children}) => children),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
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
    ...jest.requireActual('@hooks/device'),
    useIsTablet: jest.fn(() => false),
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

    it('renders correctly with initial tab set to drafts', async () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        await act(async () => {
            await TestHelper.wait(300); // Wait until the badge renders
        });

        const scheduledTab = screen.getByTestId('tabs.scheduled_posts.button');
        const draftTab = screen.getByTestId('tabs.drafts.button');

        // Check that the drafts tab is selected
        expect(scheduledTab.props.accessibilityState).toEqual({selected: false});
        expect(draftTab.props.accessibilityState).toEqual({selected: true});

        // Check that the counts are displayed correctly
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders correctly with initial tab set to scheduled post', async () => {
        const props: Parameters<typeof TabbedContents>[0] = {
            ...defaultProps,
            initialTab: DRAFT_SCREEN_TAB_SCHEDULED_POSTS,
        };
        renderWithIntlAndTheme(<TabbedContents {...props}/>);

        await act(async () => {
            await TestHelper.wait(300); // Wait until the badge renders
        });

        await act(async () => {
            await TestHelper.wait(300);
        });

        const scheduledTab = screen.getByTestId('tabs.scheduled_posts.button');
        const draftTab = screen.getByTestId('tabs.drafts.button');

        // ✅ Check accessibilityState
        expect(scheduledTab.props.accessibilityState).toEqual({selected: true});
        expect(draftTab.props.accessibilityState).toEqual({selected: false});

        // Badge counts
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('switches tabs when clicked', async () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        await act(async () => {
            await TestHelper.wait(300); // Wait until the badge renders
        });

        expect(screen.getByTestId('tabs.drafts.button')).toBeTruthy();

        expect(screen.getByTestId('drafts-content')).toBeTruthy();

        await act(async () => {
            fireEvent.press(screen.getByTestId('tabs.scheduled_posts.button'));
            await TestHelper.wait(0);
        });

        expect(screen.getByTestId('scheduled-posts-content')).toBeTruthy();

        await act(async () => {
            fireEvent.press(screen.getByTestId('tabs.drafts.button'));
            await TestHelper.wait(0);
        });

        expect(screen.getByTestId('drafts-content')).toBeTruthy();
    });

    it('displays zero counts correctly', async () => {
        renderWithIntlAndTheme(
            <TabbedContents
                {...defaultProps}
                draftsCount={0}
                scheduledPostCount={0}
            />,
        );

        // Check that zero counts are NOT displayed
        expect(screen.queryAllByText('0')).toHaveLength(0);
    });

    it('renders both content sections', async () => {
        renderWithIntlAndTheme(<TabbedContents {...defaultProps}/>);

        await act(async () => {
            await TestHelper.wait(300); // Wait until the badge renders
        });

        // Check that drafts content is initially visible
        expect(screen.getByTestId('drafts-content')).toBeTruthy();

        // Click on scheduled posts tab to make that content visible
        await act(async () => {
            fireEvent.press(screen.getByTestId('tabs.scheduled_posts.button'));

            // Add a small delay to allow animations to complete
            await TestHelper.wait(0);
        });

        // Now the scheduled posts content should be visible
        expect(screen.getByTestId('scheduled-posts-content')).toBeTruthy();
    });
});
