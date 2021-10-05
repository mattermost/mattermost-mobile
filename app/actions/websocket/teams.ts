// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {localRemoveUserFromTeam} from '@actions/local/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import {queryCurrentTeamId} from '@app/queries/servers/system';
import {queryCurrentUser} from '@app/queries/servers/user';
import {isGuest} from '@app/utils/user';
import DatabaseManager from '@database/manager';

export async function handleLeaveTeamEvent(serverUrl: string, msg: any) {
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

        // TODO originally it also removed channel categories and threads in teams. Apparently none of those features are yet implemented.
        // TODO consider whether localRemove should also remove team channel history and team search history.
        if (isGuest(user.roles)) {
            updateUsersNoLongerVisible(serverUrl);
        }
        if (currentTeamId === msg.data.team_id) {
            DeviceEventEmitter.emit('leave_team');
        }
    }
}
