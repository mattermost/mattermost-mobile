// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {handleTeamChange, localRemoveUserFromTeam} from '@actions/local/team';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchMyTeam} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {queryCurrentTeamId} from '@queries/servers/system';
import {queryLastTeam} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {isGuest} from '@utils/user';

import type {WebSocketMessage} from '@typings/api/websocket';

export async function handleLeaveTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentTeamId = await queryCurrentTeamId(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    if (user.id === msg.data.user_id) {
        localRemoveUserFromTeam(serverUrl, msg.data.team_id);

        if (isGuest(user.roles)) {
            updateUsersNoLongerVisible(serverUrl);
        }

        if (currentTeamId === msg.data.team_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_TEAM);
                await dismissAllModals();
                await popToRoot();
            }

            const teamToJumpTo = await queryLastTeam(database.database);
            if (teamToJumpTo) {
                handleTeamChange(serverUrl, teamToJumpTo);
            } // TODO else jump to "join a team" screen
        }
    }
}

export async function handleUpdateTeamEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const team = JSON.parse(msg.data.team) as Team;
        database.operator.handleTeam({
            teams: [team],
            prepareRecordsOnly: false,
        });
    } catch {
        // Do nothing
    }
}

export async function handleTeamAddedEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const teamId = msg.data.team_id;
    const {teams, memberships: teamMemberships} = await fetchMyTeam(serverUrl, teamId, false);

    if (teams?.length) {
        if (teamMemberships?.length) {
            const myMember = teamMemberships[0];
            if (myMember.roles) {
                const rolesToLoad = new Set<string>();
                for (const role of myMember.roles.split(' ')) {
                    rolesToLoad.add(role);
                }
                await fetchRolesIfNeeded(serverUrl, Array.from(rolesToLoad));
            }
        }
    }
}
