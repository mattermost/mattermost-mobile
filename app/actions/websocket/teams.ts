// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam} from '@actions/local/team';
import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchAllTeams, handleTeamChange, fetchMyTeam} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareCategories, prepareCategoryChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {getCurrentTeam, getLastTeam, prepareMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModals, popToRoot, resetToTeams} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

export async function handleLeaveTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentTeam = await getCurrentTeam(database.database);
    const user = await getCurrentUser(database.database);
    if (!user) {
        return;
    }

    const {user_id: userId, team_id: teamId} = msg.data;
    if (user.id === userId) {
        await removeUserFromTeam(serverUrl, teamId);
        fetchAllTeams(serverUrl);

        if (user.isGuest) {
            updateUsersNoLongerVisible(serverUrl);
        }

        if (currentTeam?.id === teamId) {
            const appDatabase = DatabaseManager.appDatabase?.database;
            let currentServer = '';
            if (appDatabase) {
                currentServer = await getActiveServerUrl(appDatabase);
            }

            if (currentServer === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_TEAM, currentTeam?.displayName);
                await dismissAllModals();
                await popToRoot();
            }

            const teamToJumpTo = await getLastTeam(database.database);
            if (teamToJumpTo) {
                handleTeamChange(serverUrl, teamToJumpTo);
            } else if (currentServer === serverUrl) {
                resetToTeams();
            }
        }
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
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const {team_id: teamId} = msg.data;

    // Ignore duplicated team join events sent by the server
    if (EphemeralStore.isAddingToTeam(teamId)) {
        return;
    }
    EphemeralStore.startAddingToTeam(teamId);

    const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, teamId, true);

    const modelPromises: Array<Promise<Model[]>> = [];
    if (teams?.length && teamMemberships?.length) {
        const {channels, memberships, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
        modelPromises.push(prepareCategories(operator, categories));
        modelPromises.push(prepareCategoryChannels(operator, categories));
        modelPromises.push(...await prepareMyChannelsForTeam(operator, teamId, channels || [], memberships || []));

        const {roles} = await fetchRoles(serverUrl, teamMemberships, memberships, undefined, true);
        modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
    }

    if (teams && teamMemberships) {
        modelPromises.push(...prepareMyTeams(operator, teams, teamMemberships));
    }

    const models = await Promise.all(modelPromises);
    await operator.batchRecords(models.flat());

    EphemeralStore.finishAddingToTeam(teamId);
}
