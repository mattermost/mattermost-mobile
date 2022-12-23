// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchGroupsForChannel, fetchGroupsForMember, fetchGroupsForTeam} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {deleteGroupChannelById, deleteGroupMembershipById, deleteGroupTeamById} from '@queries/servers/group';
import {generateGroupAssociationId} from '@utils/groups';
import {logError} from '@utils/log';

type WebsocketGroupMessage = WebSocketMessage<{
    group?: string; // type Group
}>

type WebsocketGroupMemberMessage = WebSocketMessage<{
    group_member?: string; // type GroupMember
}>

type WebsocketGroupTeamMessage = WebSocketMessage<{
    group_team?: string; // type GroupMember
}>

type WebsocketGroupChannelMessage = WebSocketMessage<{
    group_channel?: string; // type GroupMember
}>

type WSMessage = WebsocketGroupMessage | WebsocketGroupMemberMessage | WebsocketGroupTeamMessage | WebsocketGroupChannelMessage

const handleError = (serverUrl: string, e: unknown, msg: WSMessage) => {
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

export async function handleGroupTeamAssociatedEvent(serverUrl: string, msg: WebsocketGroupTeamMessage) {
    let groupTeam: GroupTeam;

    try {
        if (msg?.data?.group_team) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupTeam = JSON.parse(msg.data.group_team);
            const group = {id: groupTeam.group_id};

            operator.handleGroupTeamsForTeam({teamId: groupTeam.team_id, groups: [group], prepareRecordsOnly: false});
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}

export async function handleGroupTeamDissociateEvent(serverUrl: string, msg: WebsocketGroupTeamMessage) {
    let groupTeam: GroupTeam;

    try {
        if (msg?.data?.group_team) {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupTeam = JSON.parse(msg.data.group_team);

            await deleteGroupTeamById(database, generateGroupAssociationId(groupTeam.group_id, groupTeam.team_id));
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}

export async function handleGroupChannelAssociatedEvent(serverUrl: string, msg: WebsocketGroupChannelMessage) {
    let groupChannel: GroupChannel;

    try {
        if (msg?.data?.group_channel) {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupChannel = JSON.parse(msg.data.group_channel);
            const group = {id: groupChannel.group_id};

            operator.handleGroupChannelsForChannel({channelId: groupChannel.channel_id, groups: [group], prepareRecordsOnly: false});
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}

export async function handleGroupChannelDissociateEvent(serverUrl: string, msg: WebsocketGroupChannelMessage) {
    let groupChannel: GroupChannel;

    try {
        if (msg?.data?.group_channel) {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            groupChannel = JSON.parse(msg.data.group_channel);

            await deleteGroupChannelById(database, generateGroupAssociationId(groupChannel.group_id, groupChannel.channel_id));
        }
    } catch (e) {
        handleError(serverUrl, e, msg);
    }
}
