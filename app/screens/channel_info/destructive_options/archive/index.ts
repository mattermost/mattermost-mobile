// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel, observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {isDefaultChannel} from '@utils/channel';

import Archive from './archive';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
    type?: string;
}

const enhanced = withObservables(['channelId', 'type'], ({channelId, database, type}: Props) => {
    const team = observeCurrentTeam(database);
    const currentUser = observeCurrentUser(database);
    const channel = observeChannel(database, channelId);
    const canViewArchivedChannels = observeConfigBooleanValue(database, 'ExperimentalViewArchivedChannels');
    const isArchived = channel.pipe(switchMap((c) => of$((c?.deleteAt || 0) > 0)));
    const canLeave = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            const isDC = isDefaultChannel(ch);
            return of$(!isDC || (isDC && u?.isGuest));
        }),
    );

    const canArchive = channel.pipe(
        combineLatestWith(currentUser, canLeave, isArchived),
        switchMap(([ch, u, leave, archived]) => {
            if (
                type === General.DM_CHANNEL || type === General.GM_CHANNEL ||
                !ch || !u || !leave || archived
            ) {
                return of$(false);
            }

            if (type === General.OPEN_CHANNEL) {
                return observePermissionForChannel(database, ch, u, Permissions.DELETE_PUBLIC_CHANNEL, true);
            }

            return observePermissionForChannel(database, ch, u, Permissions.DELETE_PRIVATE_CHANNEL, true);
        }),
    );

    const canUnarchive = team.pipe(
        combineLatestWith(currentUser, isArchived),
        switchMap(([t, u, archived]) => {
            if (
                type === General.DM_CHANNEL || type === General.GM_CHANNEL ||
                !t || !u || !archived
            ) {
                return of$(false);
            }

            return observePermissionForTeam(database, t, u, Permissions.MANAGE_TEAM, false);
        }),
    );

    return {
        canArchive,
        canUnarchive,
        canViewArchivedChannels,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName))),
    };
});

export default withDatabase(enhanced(Archive));
