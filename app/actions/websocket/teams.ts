// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam} from '@actions/local/team';
import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchAllTeams, fetchMyTeam, handleKickFromTeam} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {getCurrentTeam, prepareMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {logDebug} from '@utils/log';

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
            fetchAllTeams(serverUrl);

            if (user.isGuest) {
                updateUsersNoLongerVisible(serverUrl);
            }
        }
    } catch (error) {
        logDebug('cannot handle leave team websocket event', error);
    }
}

export async function handleUpdateTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const team: Team = JSON.parse(msg.data.team);
        database.operator.handleTeam({
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
        DeviceEventEmitter.emit(Events.FETCHING_TEAM_CHANNELS, {serverUrl, value: true});
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, teamId, true);

        const modelPromises: Array<Promise<Model[]>> = [];
        if (teams?.length && teamMemberships?.length) {
            const {channels, memberships, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
            modelPromises.push(prepareCategoriesAndCategoriesChannels(operator, categories || [], true));
            modelPromises.push(...await prepareMyChannelsForTeam(operator, teamId, channels || [], memberships || []));

            const {roles} = await fetchRoles(serverUrl, teamMemberships, memberships, undefined, true);
            modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
        }

        if (teams && teamMemberships) {
            modelPromises.push(...prepareMyTeams(operator, teams, teamMemberships));
        }

        const models = await Promise.all(modelPromises);
        await operator.batchRecords(models.flat());
        DeviceEventEmitter.emit(Events.FETCHING_TEAM_CHANNELS, {serverUrl, value: false});
    } catch (error) {
        logDebug('could not handle user added to team websocket event');
        DeviceEventEmitter.emit(Events.FETCHING_TEAM_CHANNELS, {serverUrl, value: false});
    }

    EphemeralStore.finishAddingToTeam(teamId);
}
