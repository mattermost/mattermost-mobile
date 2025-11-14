// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General, Permissions, Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Invite from './invite';

import InviteContainer from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./invite');
jest.mocked(Invite).mockImplementation(
    (props) => React.createElement('Invite', {testID: 'invite-component', ...props}),
);

const serverUrl = 'server-url';

describe('InviteContainer', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof InviteContainer> {
        return {
            componentId: 'Invite' as any,
        };
    }

    it('should render correctly with no data', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite).toBeTruthy();
        expect(invite.props.teamId).toBeUndefined();
        expect(invite.props.teamDisplayName).toBeUndefined();
        expect(invite.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME);
        expect(invite.props.isAdmin).toBe(false);
        expect(invite.props.emailInvitationsEnabled).toBe(false);
        expect(invite.props.canInviteGuests).toBe(false);
    });

    it('should render correctly with team data', async () => {
        const team = TestHelper.fakeTeam({
            id: 'team-1',
            display_name: 'Test Team',
            invite_id: 'invite-id-1',
            last_team_icon_update: 1234567890,
        });

        await operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team-1'}],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite.props.teamId).toBe('team-1');
        expect(invite.props.teamDisplayName).toBe('Test Team');
        expect(invite.props.teamInviteId).toBe('invite-id-1');
        expect(invite.props.teamLastIconUpdate).toBe(1234567890);
    });

    it('should render correctly with system config', async () => {
        await operator.handleConfigs({
            configs: [
                {
                    id: 'EnableEmailInvitations',
                    value: 'true',
                },
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite.props.emailInvitationsEnabled).toBe(true);
    });

    it('should render correctly with user preferences', async () => {
        await operator.handlePreferences({
            preferences: [{
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.NAME_NAME_FORMAT,
                value: General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME,
                user_id: 'user-id',
            }],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite.props.teammateNameDisplay).toBe(General.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME);
    });

    it('should render correctly with admin user', async () => {
        const user = TestHelper.fakeUser({
            id: 'user-1',
            roles: 'system_admin',
        });

        await operator.handleUsers({
            users: [user],
            prepareRecordsOnly: false,
        });

        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: 'user-1',
            }],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite.props.isAdmin).toBe(true);

        user.roles = '';
        user.update_at = Date.now();
        await act(async () => {
            await operator.handleUsers({
                users: [user],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(invite.props.isAdmin).toBe(false);
        });
    });

    it('should calculate canInviteGuests correctly', async () => {
        const team = TestHelper.fakeTeam({
            id: 'team-1',
            group_constrained: false,
        });

        await operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });

        await operator.handleMyTeam({
            myTeams: [{id: 'team-1', roles: 'team_admin'}],
            prepareRecordsOnly: false,
        });

        await operator.handleRole({
            roles: [{id: 'team_admin', name: 'team_admin', permissions: [Permissions.INVITE_GUEST]}],
            prepareRecordsOnly: false,
        });

        await operator.handleConfigs({
            configs: [{id: 'EnableGuestAccounts', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user-1'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team-1'},
            ],
            prepareRecordsOnly: false,
        });

        const user = TestHelper.fakeUser({
            id: 'user-1',
        });

        await operator.handleUsers({
            users: [user],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<InviteContainer {...props}/>, {database});

        const invite = getByTestId('invite-component');
        expect(invite.props.canInviteGuests).toBe(true);

        await act(async () => {
            team.group_constrained = true;
            team.update_at = Date.now();
            await operator.handleTeam({
                teams: [team],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(invite.props.canInviteGuests).toBe(false);
        });

        await act(async () => {
            team.group_constrained = false;
            team.update_at = Date.now();
            await operator.handleTeam({
                teams: [team],
                prepareRecordsOnly: false,
            });

            await operator.handleMyTeam({
                myTeams: [{id: 'team-1', roles: ''}],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(invite.props.canInviteGuests).toBe(false);
        });

        await act(async () => {
            await operator.handleMyTeam({
                myTeams: [{id: 'team-1', roles: 'team_admin'}],
                prepareRecordsOnly: false,
            });
            await operator.handleConfigs({
                configs: [{id: 'EnableGuestAccounts', value: 'false'}],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(invite.props.canInviteGuests).toBe(false);
        });
    });
});

