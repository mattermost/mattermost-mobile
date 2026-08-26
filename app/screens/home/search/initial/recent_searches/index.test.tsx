// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {getTeamSearchHistoryById} from '@queries/servers/team';
import {fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RecentSearches from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const serverUrl = 'https://server-url.com';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => serverUrl),
}));

describe('RecentSearches', () => {
    let database: Database;
    let operator: ServerDataOperator;

    const recentSearches = [{
        id: 'hist1',
        term: 'hello',
        displayTerm: 'hello',
        teamId: 'team1',
        createdAt: 1,
    }] as TeamSearchHistoryModel[];

    beforeEach(async () => {
        ({database, operator} = await TestHelper.setupServerDatabase(serverUrl));
    });

    afterEach(async () => {
        await TestHelper.tearDown(serverUrl);
    });

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

    it('should remove a recent search from the database', async () => {
        const [recentSearch] = await operator.handleTeamSearchHistory({
            teamSearchHistories: [{
                team_id: 'team1',
                created_at: 1,
                term: 'hello',
                display_term: 'hello',
            }],
            prepareRecordsOnly: false,
        });
        const {getByTestId} = renderWithIntlAndTheme(
            <RecentSearches
                recentSearches={[recentSearch]}
                setRecentValue={jest.fn()}
                teamName='Team'
            />,
        );

        fireEvent.press(getByTestId('search.recent_item.hello.remove.button'));

        await waitFor(async () => {
            expect(await getTeamSearchHistoryById(database, recentSearch.id)).toBeUndefined();
        });
    });
});
