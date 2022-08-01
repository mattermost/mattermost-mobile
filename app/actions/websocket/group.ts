// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchGroupsForChannel, fetchGroupsForMember, fetchGroupsForTeam} from '@actions/remote/groups';
import {deleteGroupMembershipById} from '@app/queries/servers/group';
import {generateGroupAssociationId} from '@app/utils/groups';
import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

type WebsocketGroupMessage = WebSocketMessage<{
    group?: string; // type Group
}>

type WebsocketGroupMemberMessage = WebSocketMessage<{
    group_member?: string; // type GroupMember
}>

const handleError = (serverUrl: string, e: unknown, msg: WebsocketGroupMessage | WebsocketGroupMemberMessage) => {
    logError(`Group WS: ${msg.event}`, e, msg);

    const {team_id, channel_id, user_id} = msg.broadcast;

    if (team_id) {
        fetchGroupsForTeam(serverUrl, msg.broadcast.team_id);
    }
    if (channel_id) {
        fetchGroupsForChannel(serverUrl, msg.broadcast.channel_id);
    }
    if (user_id) {
        fetchGroupsForMember(serverUrl, msg.broadcast.user_id);
    }
};

export async function handleGroupReceivedEvent(serverUrl: string, msg: WebsocketGroupMessage) {
    let group: Group;

    try {
        if (msg?.data?.group) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            group = JSON.parse(msg.data.group);
            operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}

export async function handleGroupMemberAddEvent(serverUrl: string, msg: WebsocketGroupMemberMessage) {
    let groupMember: GroupMembership;

    try {
        if (msg?.data?.group_member) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupMember = JSON.parse(msg.data.group_member);
            const group = {id: groupMember.group_id};

            operator.handleGroupMembershipsForMember({userId: groupMember.user_id, groups: [group], prepareRecordsOnly: false});
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}

export async function handleGroupMemberDeleteEvent(serverUrl: string, msg: WebsocketGroupMemberMessage) {
    let groupMember: GroupMembership;

    try {
        if (msg?.data?.group_member) {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupMember = JSON.parse(msg.data.group_member);

            await deleteGroupMembershipById(database, generateGroupAssociationId(groupMember.group_id, groupMember.user_id));
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}
