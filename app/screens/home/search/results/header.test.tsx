// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme, fireEvent} from '@test/intl-test-helper';
import {FileFilters} from '@utils/file';
import {TabTypes} from '@utils/search';

import Header from './header';

import type TeamModel from '@typings/database/models/servers/team';

// Some subcomponents require react-native-camera-roll, which is not available in the test environment
jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

describe('Header', () => {
    const onTabSelect = jest.fn();
    const onFilterChanged = jest.fn();
    const setTeamId = jest.fn();

    const teams = [
        {id: 'team1', displayName: 'Team 1'},
        {id: 'team2', displayName: 'Team 2'},
    ] as TeamModel[];

    it('should render correctly', () => {
        const {getByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
            />,
        );

        expect(getByText('Messages')).toBeTruthy();
        expect(getByText('Files')).toBeTruthy();
    });

    it('should call onTabSelect with MESSAGES when Messages button is pressed', () => {
        const {getByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
            />,
        );

        fireEvent.press(getByText('Messages'));
        expect(onTabSelect).toHaveBeenCalledWith(TabTypes.MESSAGES);
    });

    it('should call onTabSelect with FILES when Files button is pressed', () => {
        const {getByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
            />,
        );

        fireEvent.press(getByText('Files'));
        expect(onTabSelect).toHaveBeenCalledWith(TabTypes.FILES);
    });

    it('should not render TeamPicker when there is only one team', () => {
        const {queryByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={[teams[0]]}
                crossTeamSearchEnabled={false}
            />,
        );

        expect(queryByText('Team 1')).toBeFalsy();
    });

    it('should render TeamPicker when there are multiple teams', () => {
        const {getByText} = renderWithIntlAndTheme(
            <Header
                teamId='team1'
                setTeamId={setTeamId}
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={TabTypes.MESSAGES}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
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
                onTabSelect={onTabSelect}
                onFilterChanged={onFilterChanged}
                selectedTab={selectedTab}
                selectedFilter={FileFilters.ALL}
                teams={teams}
                crossTeamSearchEnabled={false}
            />,
        );

        if (shouldShowIcon) {
            expect(queryByTestId('search.filters.file_type_icon')).toBeTruthy();
        } else {
            expect(queryByTestId('search.filters.file_type_icon')).toBeFalsy();
        }
    });
});
