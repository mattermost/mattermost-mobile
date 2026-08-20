// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import RecentSearches from './index';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://server-url.com'),
}));

jest.mock('@actions/local/team', () => ({
    removeSearchFromTeamSearchHistory: jest.fn(),
}));

describe('RecentSearches', () => {
    const recentSearches = [{
        id: 'hist1',
        term: 'hello',
        displayTerm: 'hello',
        teamId: 'team1',
        createdAt: 1,
    }] as TeamSearchHistoryModel[];

    it('should keep recent remove controls in the tree', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <RecentSearches
                recentSearches={recentSearches}
                setRecentValue={jest.fn()}
                teamName='Team'
            />,
        );

        expect(getByTestId('search.recents_list').props.removeClippedSubviews).toBe(false);
        expect(getByTestId('search.recent_item.hello.remove.button')).toBeTruthy();
    });
});
