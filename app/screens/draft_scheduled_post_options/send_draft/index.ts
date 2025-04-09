// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeConfigBooleanValue, observeCurrentChannelId} from '@queries/servers/system';
import {observeCurrentUser, observeUser} from '@queries/servers/user';
import {isSystemAdmin, getUserIdFromChannelName} from '@utils/user';

import SendDraft from './send_draft';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
    rootId?: string;
}

const enhanced = withObservables(['channelId', 'rootId'], (ownProps: WithDatabaseArgs & OwnProps) => {
    const {database} = ownProps;
    let channelId = of$(ownProps.channelId);
    if (!ownProps.channelId) {
        channelId = observeCurrentChannelId(database);
    }

    const currentUser = observeCurrentUser(database);

    const channel = channelId.pipe(
        switchMap((id) => observeChannel(database, id!)),
    );

    const canPost = combineLatest([channel, currentUser]).pipe(switchMap(([c, u]) => (c && u ? observePermissionForChannel(database, c, u, Permissions.CREATE_POST, true) : of$(true))));
    const channelIsArchived = channel.pipe(switchMap((c) => (of$(c?.deleteAt !== 0))));

    const experimentalTownSquareIsReadOnly = observeConfigBooleanValue(database, 'ExperimentalTownSquareIsReadOnly');
    const channelIsReadOnly = combineLatest([currentUser, channel, experimentalTownSquareIsReadOnly]).pipe(
        switchMap(([u, c, readOnly]) => of$(c?.name === General.DEFAULT_CHANNEL && !isSystemAdmin(u?.roles || '') && readOnly)),
    );

    const deactivatedChannel = combineLatest([currentUser, channel]).pipe(
        switchMap(([u, c]) => {
            if (!u || !c || c.type !== General.DM_CHANNEL) {
                return of$(null);
            }

            const teammateId = getUserIdFromChannelName(u.id, c.name);
            if (!teammateId) {
                return of$(null);
            }

            return observeUser(database, teammateId);
        }),
        switchMap((u2) => of$(Boolean(u2?.deleteAt))),
    );

    return {
        canPost,
        channelIsArchived,
        channelIsReadOnly,
        deactivatedChannel,
    };
});

export default withDatabase(enhanced(SendDraft));
