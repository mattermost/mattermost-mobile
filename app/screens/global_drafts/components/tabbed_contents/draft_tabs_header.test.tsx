// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS} from '@constants/draft';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {DraftTabsHeader} from './draft_tabs_header';

describe('DraftTabsHeader', () => {
    const baseProps: Parameters<typeof DraftTabsHeader>[0] = {
        draftsCount: 5,
        scheduledPostCount: 3,
        selectedTab: 0,
        onTabChange: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with default props', async () => {
        renderWithIntlAndTheme(<DraftTabsHeader {...baseProps}/>);

        await act(async () => {
            await TestHelper.wait(200); // Wait until the badge renders
        });

        expect(screen.getByTestId('draft_tab_container')).toBeTruthy();
        expect(screen.getByTestId('draft_tab')).toBeTruthy();
        expect(screen.getByTestId('scheduled_post_tab')).toBeTruthy();

        // Check if badges are displayed with correct counts
        expect(screen.getByTestId('draft_count_badge')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.getByTestId('scheduled_post_count_badge')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('calls onTabChange when draft tab is pressed', async () => {
        renderWithIntlAndTheme(
            <DraftTabsHeader
                {...baseProps}
                selectedTab={1}
            />,
        );

        await act(async () => {
            await TestHelper.wait(200); // Wait until the badge renders
            fireEvent.press(screen.getByTestId('draft_tab'));
        });

        expect(baseProps.onTabChange).toHaveBeenCalledWith(DRAFT_SCREEN_TAB_DRAFTS);
    });

    it('calls onTabChange when scheduled post tab is pressed', async () => {
        renderWithIntlAndTheme(<DraftTabsHeader {...baseProps}/>);

        await act(async () => {
            await TestHelper.wait(200); // Wait until the badge renders
            fireEvent.press(screen.getByTestId('scheduled_post_tab'));
        });

        expect(baseProps.onTabChange).toHaveBeenCalledWith(DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
    });
});
