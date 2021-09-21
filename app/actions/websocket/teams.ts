// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {localRemoveUserFromTeam} from '@actions/local/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import {queryCommonSystemValues} from '@app/queries/servers/system';
import {queryCurrentUser} from '@app/queries/servers/user';
import {isGuest} from '@app/utils/user';
import DatabaseManager from '@database/manager';

export async function handleLeaveTeamEvent(serverURL: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverURL];
    if (!database) {
        return;
    }

    const {currentTeamId} = await queryCommonSystemValues(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    if (user.id === msg.data.user_id) {
        localRemoveUserFromTeam(serverURL, msg.data.team_id, user.id);

        // TODO originally it also removed channel categories and threads in teams. Apparently none of those features are yet implemented.
        // TODO consider whether localRemove should also remove team channel history and team search history.
        if (isGuest(user.roles)) {
            updateUsersNoLongerVisible(serverURL);
        }
        if (currentTeamId === msg.data.team_id) {
            DeviceEventEmitter.emit('leave_team');
        }
    }
}
