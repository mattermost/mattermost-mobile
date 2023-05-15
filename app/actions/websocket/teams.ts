// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removeUserFromTeam} from '@actions/local/team';
import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchMyTeam, handleKickFromTeam, updateCanJoinTeams} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {getCurrentTeam, prepareMyTeams, queryMyTeamsByIds} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {setTeamLoading} from '@store/team_load_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Model} from '@nozbe/watermelondb';

export async function handleTeamArchived(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const team: Team = JSON.parse(msg.data.team);

        const membership = (await queryMyTeamsByIds(database, [team.id]).fetch())[0];
        if (membership) {
            const currentTeam = await getCurrentTeam(database);
            if (currentTeam?.id === team.id) {
                await handleKickFromTeam(serverUrl, team.id);
            }

            await removeUserFromTeam(serverUrl, team.id);

            const user = await getCurrentUser(database);
            if (user?.isGuest) {
                updateUsersNoLongerVisible(serverUrl);
            }
        }
        updateCanJoinTeams(serverUrl);
    } catch (error) {
        logDebug('cannot handle archive team websocket event', error);
    }
}

export async function handleTeamRestored(serverUrl: string, msg: WebSocketMessage) {
    let markedAsLoading = false;
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const team: Team = JSON.parse(msg.data.team);

        const teamMembership = await client.getTeamMember(team.id, 'me');
        if (teamMembership && teamMembership.delete_at === 0) {
            // Ignore duplicated team join events sent by the server
            if (EphemeralStore.isAddingToTeam(team.id)) {
                return;
            }
            EphemeralStore.startAddingToTeam(team.id);

            setTeamLoading(serverUrl, true);
            markedAsLoading = true;
            await fetchAndStoreJoinedTeamInfo(serverUrl, operator, team.id, [team], [teamMembership]);
            setTeamLoading(serverUrl, false);
            markedAsLoading = false;

            EphemeralStore.finishAddingToTeam(team.id);
        }

        updateCanJoinTeams(serverUrl);
    } catch (error) {
        if (markedAsLoading) {
            setTeamLoading(serverUrl, false);
        }
        logDebug('cannot handle restore team websocket event', getFullErrorMessage(error));
    }
}

export async function handleLeaveTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const user = await getCurrentUser(database);
        if (!user) {
            return;
        }

        const {user_id: userId, team_id: teamId} = msg.data;
        if (user.id === userId) {
            const currentTeam = await getCurrentTeam(database);
            if (currentTeam?.id === teamId) {
                await handleKickFromTeam(serverUrl, teamId);
            }

            await removeUserFromTeam(serverUrl, teamId);
            updateCanJoinTeams(serverUrl);

            if (user.isGuest) {
                updateUsersNoLongerVisible(serverUrl);
            }
        }
    } catch (error) {
        logDebug('cannot handle leave team websocket event', error);
    }
}

export async function handleUpdateTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const team: Team = JSON.parse(msg.data.team);
        operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });
    } catch (err) {
        // Do nothing
    }
}

export async function handleUserAddedToTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const {team_id: teamId} = msg.data;

    // Ignore duplicated team join events sent by the server
    if (EphemeralStore.isAddingToTeam(teamId)) {
        return;
    }
    EphemeralStore.startAddingToTeam(teamId);

    try {
        setTeamLoading(serverUrl, true);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, teamId, true);

        await fetchAndStoreJoinedTeamInfo(serverUrl, operator, teamId, teams, teamMemberships);
    } catch (error) {
        logDebug('could not handle user added to team websocket event');
    }
    setTeamLoading(serverUrl, false);
    EphemeralStore.finishAddingToTeam(teamId);
}

const fetchAndStoreJoinedTeamInfo = async (serverUrl: string, operator: ServerDataOperator, teamId: string, teams?: Team[], teamMemberships?: TeamMembership[]) => {
    const modelPromises: Array<Promise<Model[]>> = [];
    if (teams?.length && teamMemberships?.length) {
        const {channels, memberships, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
        modelPromises.push(prepareCategoriesAndCategoriesChannels(operator, categories || [], true));
        modelPromises.push(...await prepareMyChannelsForTeam(operator, teamId, channels || [], memberships || []));

        const {roles} = await fetchRoles(serverUrl, teamMemberships, memberships, undefined, true);
        if (roles?.length) {
            modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
        }
    }

    if (teams && teamMemberships) {
        modelPromises.push(...prepareMyTeams(operator, teams, teamMemberships));
    }

    const models = await Promise.all(modelPromises);
    await operator.batchRecords(models.flat(), 'fetchAndStoreJoinedTeamInfo');
};
