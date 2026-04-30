// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {dismissBottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {confirmLeaveTeam, openJoinTeamModal} from '@utils/team_menu';

import TeamMenu from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@utils/team_menu', () => ({
    openJoinTeamModal: jest.fn(),
    confirmLeaveTeam: jest.fn(),
}));

const serverUrl = 'http://www.someserverurl.com';

function getBaseProps(overrides: Partial<ComponentProps<typeof TeamMenu>> = {}): ComponentProps<typeof TeamMenu> {
    return {
        canJoinOtherTeams: true,
        hasMoreThanOneTeam: true,
        currentTeamId: 'team-id',
        currentTeamDisplayName: 'My Team',
        ...overrides,
    };
}

describe('TeamMenu', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders both rows when both flags are true', () => {
        const {getByTestId} = renderWithEverything(
            <TeamMenu {...getBaseProps()}/>,
            {database, serverUrl},
        );

        expect(getByTestId('team_menu.join_another_team')).toBeTruthy();
        expect(getByTestId('team_menu.leave_team')).toBeTruthy();
    });

    it('hides the join row when canJoinOtherTeams is false', () => {
        const {queryByTestId, getByTestId} = renderWithEverything(
            <TeamMenu {...getBaseProps({canJoinOtherTeams: false})}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('team_menu.join_another_team')).toBeNull();
        expect(getByTestId('team_menu.leave_team')).toBeTruthy();
    });

    it('hides the leave row when hasMoreThanOneTeam is false', () => {
        const {queryByTestId, getByTestId} = renderWithEverything(
            <TeamMenu {...getBaseProps({hasMoreThanOneTeam: false})}/>,
            {database, serverUrl},
        );

        expect(getByTestId('team_menu.join_another_team')).toBeTruthy();
        expect(queryByTestId('team_menu.leave_team')).toBeNull();
    });

    it('dismisses the sheet and opens the join modal when Join is pressed', async () => {
        const {getByTestId} = renderWithEverything(
            <TeamMenu {...getBaseProps()}/>,
            {database, serverUrl},
        );

        await act(async () => {
            fireEvent.press(getByTestId('team_menu.join_another_team'));
        });

        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
        expect(openJoinTeamModal).toHaveBeenCalledTimes(1);
    });

    it('dismisses the sheet and shows the leave confirmation when Leave is pressed', async () => {
        const {getByTestId} = renderWithEverything(
            <TeamMenu {...getBaseProps()}/>,
            {database, serverUrl},
        );

        await act(async () => {
            fireEvent.press(getByTestId('team_menu.leave_team'));
        });

        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
        expect(confirmLeaveTeam).toHaveBeenCalledTimes(1);
        const [, passedServerUrl, teamId, displayName] = (confirmLeaveTeam as jest.Mock).mock.calls[0];
        expect(passedServerUrl).toBe(serverUrl);
        expect(teamId).toBe('team-id');
        expect(displayName).toBe('My Team');
    });
});
