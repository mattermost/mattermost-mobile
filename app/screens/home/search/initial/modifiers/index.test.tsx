// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ALL_TEAMS_ID} from '@constants/team';
import TeamPicker from '@screens/home/search/team_picker';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Modifiers from './index';

import type {SearchRef} from '@components/search';
import type {TeamModel} from '@database/models/server';
import type {SharedValue} from 'react-native-reanimated';

jest.mock('@screens/home/search/team_picker', () => jest.fn(() => null));
jest.mock('./show_more', () => jest.fn(() => null));
jest.mock('@react-native-camera-roll/camera-roll', () => jest.fn());

describe('Modifiers', () => {
    const searchRef = React.createRef<SearchRef>();
    const setSearchValue = jest.fn();
    const setTeamId = jest.fn();
    const teams = [{id: 'team1', displayName: 'Team 1'}, {id: 'team2', displayName: 'Team 2'}] as TeamModel[];

    const renderComponent = (teamId = ALL_TEAMS_ID, teamList?: TeamModel[]) => {
        return renderWithIntlAndTheme(
            <Modifiers
                setSearchValue={setSearchValue}
                setTeamId={setTeamId}
                teamId={teamId}
                teams={teamList || teams}
                scrollEnabled={{value: true} as SharedValue<boolean>}
                searchRef={searchRef}
                crossTeamSearchEnabled={true}
            />,
        );
    };

    it('should render correctly', () => {
        const {getByTestId} = renderComponent();
        expect(getByTestId('search.modifier.header')).toBeTruthy();
    });

    it('should render TeamPicker when there are multiple teams', () => {
        renderComponent();
        expect(TeamPicker).toHaveBeenCalled();
    });

    it('should not render TeamPicker when there is only one team', () => {
        renderComponent(ALL_TEAMS_ID, [teams[0]]);
        expect(TeamPicker).not.toHaveBeenCalled();
    });

    it('should render the From: and In: modifiers when a team is selected', () => {
        const {getByTestId} = renderComponent('team1');
        expect(getByTestId('search.modifier.from')).toBeTruthy();
        expect(getByTestId('search.modifier.in')).toBeTruthy();
    });

    it('should not render the From: and In: modifiers when all teams are selected', () => {
        const {queryByTestId} = renderComponent(ALL_TEAMS_ID);
        expect(queryByTestId('search.modifier.from')).toBeNull();
        expect(queryByTestId('search.modifier.in')).toBeNull();
    });
});
