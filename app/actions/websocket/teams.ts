// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {handleTeamChange, localRemoveUserFromTeam} from '@actions/local/team';
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

    const teamFromData = JSON.parse(msg.data.team);
    const team: Team = {
        ...teamFromData,
    };

    database.operator.handleTeam({
        teams: [team],
        prepareRecordsOnly: false,
    });
}

export async function handleTeamAddedEvent(serverUrl: string, msg: WebSocketMessage) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const [team, memberships] = await Promise.all([
        fetchMyTeam(serverUrl, msg.data.team_id),
    ]);

    console.log('team', team);
    console.log('memberships', memberships);

    // const [team, member, teamUnreads] = await Promise.all([
    //     Client4.getTeam(msg.data.team_id),
    //     Client4.getTeamMember(teamId, userId),
    //     Client4.getMyTeamUnreads(),
    // ]);

    // const actions = [];
    // if (team) {
    //     actions.push({
    //         type: TeamTypes.RECEIVED_TEAM,
    //         data: team,
    //     });
    //
    //     if (member) {
    //         actions.push({
    //             type: TeamTypes.RECEIVED_MY_TEAM_MEMBER,
    //             data: member,
    //         });
    //
    //         if (member.roles) {
    //             const rolesToLoad = new Set<string>();
    //             for (const role of member.roles.split(' ')) {
    //                 rolesToLoad.add(role);
    //             }
    //
    //             if (rolesToLoad.size > 0) {
    //                 const roles = await Client4.getRolesByNames(Array.from(rolesToLoad));
    //                 if (roles.length) {
    //                     actions.push({
    //                         type: RoleTypes.RECEIVED_ROLES,
    //                         data: roles,
    //                     });
    //                 }
    //             }
    //         }
    //     }
    //
    //     if (teamUnreads) {
    //         actions.push({
    //             type: TeamTypes.RECEIVED_MY_TEAM_UNREADS,
    //             data: teamUnreads,
    //         });
    //     }
    // }
    //
    // if (actions.length) {
    //     dispatch(batchActions(actions, 'BATCH_WS_TEAM_ADDED'));
    // }
    //
    // return {data: true};
}
