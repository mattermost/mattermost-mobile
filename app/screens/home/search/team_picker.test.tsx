// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ALL_TEAMS_ID} from '@constants/team';
import {bottomSheet} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';

import TeamPicker from './team_picker';

import type {TeamModel} from '@database/models/server';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

// Some subcomponents require react-native-camera-roll, which is not available in the test environment
jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

describe('TeamPicker', () => {
    const teams = [
    {id: 'team1', displayName: 'Team 1'} as TeamModel,
    {id: 'team2', displayName: 'Team 2'} as TeamModel,
    ];

    it('should render the selected team name', async () => {
        const {getByText} = renderWithIntlAndTheme(
            <TeamPicker
                setTeamId={jest.fn()}
                teams={teams}
                teamId={'team1'}
                crossTeamSearchEnabled={true}
            />,
        );
        await waitFor(() => {
            expect(getByText('Team 1')).toBeTruthy();
        });
    });

    it('should render "All teams" when teamId is ALL_TEAMS_ID', async () => {
        const {getByText} = renderWithIntlAndTheme(
            <TeamPicker
                setTeamId={jest.fn()}
                teams={teams}
                teamId={ALL_TEAMS_ID}
                crossTeamSearchEnabled={true}
            />,
        );
        await waitFor(() => {
            expect(getByText('All teams')).toBeTruthy();
        });
    });

    it('should call bottomSheet when the team picker is pressed', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <TeamPicker
                setTeamId={jest.fn()}
                teams={teams}
                teamId={'team1'}
                crossTeamSearchEnabled={true}
            />,
        );
        await waitFor(() => {
            expect(getByTestId('team_picker.button')).toBeTruthy();
        });
        fireEvent.press(getByTestId('team_picker.button'));
        expect(bottomSheet).toHaveBeenCalled();
    });
});
