// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeAllActiveServers} from '@app/queries/app/servers';
import {CallNotification} from '@calls/components/call_notification/call_notification';
import DatabaseManager from '@database/manager';
import {observeChannelMembers} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import type {IncomingCallNotification} from '@calls/types/calls';

type OwnProps = {
    incomingCall: IncomingCallNotification;
}

const enhanced = withObservables(['incomingCall'], ({incomingCall}: OwnProps) => {
    const database = of$(DatabaseManager.serverDatabases[incomingCall.serverUrl]?.database);
    const currentUserId = database.pipe(
        switchMap((db) => (db ? observeCurrentUserId(db) : of$(''))),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const members = database.pipe(
        switchMap((db) => (db ? observeChannelMembers(db, incomingCall.channelID) : of$([]))),
        distinctUntilChanged(),
    );

    return {
        servers: observeAllActiveServers(),
        currentUserId,
        teammateNameDisplay,
        members,
    };
});

export default enhanced(CallNotification);
