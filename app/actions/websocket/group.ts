// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchGroup, fetchGroupsForChannel, fetchGroupsForMember, fetchGroupsForTeam} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

type WebsocketGroupMessage = WebSocketMessage<{
    group?: string; // type Group
}>

const handleError = (serverUrl: string, e: unknown, msg: WebsocketGroupMessage) => {
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

    const group = JSON.parse(msg.data.group || '') as Partial<Group>;
    if (!team_id && !channel_id && !user_id && group.id) {
        fetchGroup(serverUrl, group.id);
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
