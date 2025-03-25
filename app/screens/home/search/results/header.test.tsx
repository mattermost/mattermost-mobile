// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {renderWithIntlAndTheme, fireEvent} from '@test/intl-test-helper';
import {FileFilters} from '@utils/file';
import {TabTypes} from '@utils/search';

import Header from './header';

import type TeamModel from '@typings/database/models/servers/team';

// Some subcomponents require react-native-camera-roll, which is not available in the test environment
jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

describe('Header', () => {
    const onFilterChanged = jest.fn();
    const setTeamId = jest.fn();

    const teams = [
        {id: 'team1', displayName: 'Team 1'},
        {id: 'team2', displayName: 'Team 2'},
    ] as TeamModel[];

    it('should not render TeamPicker when there is only one team', () => {
        const {queryByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={[teams[0]]}
                crossTeamSearchEnabled={false}
                tabsComponent={<View/>}
            />,
        );

        expect(queryByText('Team 1')).toBeFalsy();
    });

    it('should render TeamPicker when there are multiple teams', () => {
        const {getByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
                tabsComponent={<View/>}
            />,
        );

        expect(getByText('Team 1')).toBeTruthy();
    });

    it.each([
        {selectedTab: TabTypes.FILES, shouldShowIcon: true, label: 'should render the file type filter when the Files tab is selected'},
        {selectedTab: TabTypes.MESSAGES, shouldShowIcon: false, label: 'should not render the file type filter when the Messages tab is selected'},
    ])('$label', ({selectedTab, shouldShowIcon}) => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onFilterChanged={onFilterChanged}
                selectedTab={selectedTab}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
                tabsComponent={<View/>}
            />,
        );

        if (shouldShowIcon) {
            expect(queryByTestId('search.filters.file_type_icon')).toBeTruthy();
        } else {
            expect(queryByTestId('search.filters.file_type_icon')).toBeFalsy();
        }
    });

    it('should render the provided tabsComponent', () => {
        const testId = 'tabsComponent';

        const {getByTestId} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
                tabsComponent={<View testID={testId}/>}
            />,
        );

        expect(getByTestId(testId)).toBeTruthy();
    });
});
