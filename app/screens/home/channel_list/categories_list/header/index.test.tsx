// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Permissions} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListHeader from './header';

import ChannelListHeaderIndex from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./header');
jest.mocked(ChannelListHeader).mockImplementation((props) => {
    return React.createElement('ChannelListHeader', {
        testID: 'channel-list-header',
        ...props,
    });
});

describe('ChannelListHeader Index', () => {
    const serverUrl = 'server-url';
    const currentUserId = 'current-user-id';
    const currentTeamId = 'current-team-id';
    const teamDisplayName = 'Team Display Name';

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
        jest.clearAllMocks();
    });

    it('renders ChannelListHeader component with no data', () => {
        const {getByTestId} = renderWithEverything(
            <ChannelListHeaderIndex/>,
            {database},
        );

        const component = getByTestId('channel-list-header');
        expect(component).toBeTruthy();
        expect(component.props.displayName).toBeUndefined();
        expect(component.props.pushProxyStatus).toBe(PUSH_PROXY_STATUS_UNKNOWN);
        expect(component.props.canCreateChannels).toBe(true); // By default, we allow creating channels
        expect(component.props.canJoinChannels).toBe(true); // By default, we allow joining channels
        expect(component.props.canInvitePeople).toBe(false);
    });

    it('renders ChannelListHeader component with team and user data', async () => {
        const team = TestHelper.fakeTeam({
            id: currentTeamId,
            display_name: teamDisplayName,
        });
        const user = TestHelper.fakeUser({
            id: currentUserId,
            roles: 'system_user',
        });

        await operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [user],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
            ],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_VERIFIED}],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <ChannelListHeaderIndex/>,
            {database},
        );

        const component = getByTestId('channel-list-header');
        expect(component).toBeTruthy();
        expect(component.props.displayName).toBe(teamDisplayName);
        expect(component.props.pushProxyStatus).toBe(PUSH_PROXY_STATUS_VERIFIED);
        expect(component.props.canCreateChannels).toBe(false);
        expect(component.props.canJoinChannels).toBe(false);
        expect(component.props.canInvitePeople).toBe(false);
    });

    it('reacts to current team and push status changes', async () => {
        const team1 = TestHelper.fakeTeam({
            id: currentTeamId,
            display_name: 'Team One',
        });
        const team2Id = 'other-team-id';
        const team2 = TestHelper.fakeTeam({
            id: team2Id,
            display_name: 'Team Two',
        });

        await operator.handleTeam({
            teams: [team1, team2],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId}],
            prepareRecordsOnly: false,
        });

        const {getByTestId} = renderWithEverything(
            <ChannelListHeaderIndex/>,
            {database},
        );

        let component = getByTestId('channel-list-header');
        expect(component.props.displayName).toBe('Team One');
        expect(component.props.pushProxyStatus).toBe(PUSH_PROXY_STATUS_UNKNOWN);

        // Update current team
        await act(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: team2Id}],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            component = getByTestId('channel-list-header');
            expect(component.props.displayName).toBe('Team Two');
        });

        // Update push verification status
        await act(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_VERIFIED}],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            component = getByTestId('channel-list-header');
            expect(component.props.pushProxyStatus).toBe(PUSH_PROXY_STATUS_VERIFIED);
        });
    });

    describe('canJoinChannels', () => {
        it('is true when user has JOIN_PUBLIC_CHANNELS permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: [Permissions.JOIN_PUBLIC_CHANNELS]},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canJoinChannels).toBe(true);
        });

        it('is false when user lacks JOIN_PUBLIC_CHANNELS permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canJoinChannels).toBe(false);
        });
    });

    describe('canCreateChannels', () => {
        it('is true when user has CREATE_PUBLIC_CHANNEL permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: [Permissions.CREATE_PUBLIC_CHANNEL]},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canCreateChannels).toBe(true);
        });

        it('is true when user has only CREATE_PRIVATE_CHANNEL permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: [Permissions.CREATE_PRIVATE_CHANNEL]},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canCreateChannels).toBe(true);
        });

        it('is false when user has neither CREATE_PUBLIC_CHANNEL nor CREATE_PRIVATE_CHANNEL', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canCreateChannels).toBe(false);
        });
    });

    describe('canInvitePeople', () => {
        it('is true when user has ADD_USER_TO_TEAM permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: [Permissions.ADD_USER_TO_TEAM]},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canInvitePeople).toBe(true);
        });

        it('is true when EnableGuestAccounts is true and user has INVITE_GUEST permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: [Permissions.INVITE_GUEST]},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleConfigs({
                configs: [{id: 'EnableGuestAccounts', value: 'true'}],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canInvitePeople).toBe(true);
        });

        it('is false when user has neither ADD_USER_TO_TEAM nor invite guest permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: []},
                ],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canInvitePeople).toBe(false);
        });

        it('is false when EnableGuestAccounts is false even if user has INVITE_GUEST permission', async () => {
            const team = TestHelper.fakeTeam({id: currentTeamId, display_name: teamDisplayName});
            const user = TestHelper.fakeUser({id: currentUserId, roles: 'system_user'});

            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: currentUserId},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: currentTeamId, roles: 'team_user'}],
                prepareRecordsOnly: false,
            });
            await operator.handleRole({
                roles: [
                    {id: 'system_user', name: 'system_user', permissions: []},
                    {id: 'team_user', name: 'team_user', permissions: [Permissions.INVITE_GUEST]},
                ],
                prepareRecordsOnly: false,
            });
            await operator.handleConfigs({
                configs: [{id: 'EnableGuestAccounts', value: 'false'}],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const {getByTestId} = renderWithEverything(<ChannelListHeaderIndex/>, {database});
            const component = getByTestId('channel-list-header');
            expect(component.props.canInvitePeople).toBe(false);
        });
    });
});
