// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {RoleTypes} from '@mm-redux/action_types';
// import {GenericAction} from '@mm-redux/types/actions';

import {inspect} from 'util';

import DatabaseManager from '@database/manager';
import {WebSocketMessage} from '@typings/api/websocket';

export async function handleRoleAddedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    console.log('msg = ', inspect(msg, false, null, true /* enable colors */));
    const role = JSON.parse(msg.data.role);
    console.log('role', role);

    // database.operator.handleRole();
}

export async function handleRoleRemovedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const role = JSON.parse(msg.data.role);
    console.log('role', role);

    // return {
    //     type: RoleTypes.ROLE_DELETED,
    //     data: role,
    // };
}

export async function handleRoleUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const role = JSON.parse(msg.data.role);
    console.log('role', role);

    // return {
    //     type: RoleTypes.RECEIVED_ROLE,
    //     data: role,
    // };
}
