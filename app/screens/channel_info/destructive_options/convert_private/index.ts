// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observePermissionForChannel} from '@queries/servers/role';
import {observeCurrentUser} from '@queries/servers/user';
import {isDefaultChannel} from '@utils/channel';

import ConvertPrivate from './convert_private';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUser = observeCurrentUser(database);
    const channel = observeChannel(database, channelId);
    const canConvert = channel.pipe(
        combineLatestWith(currentUser),
        switchMap(([ch, u]) => {
            if (!ch || !u || isDefaultChannel(ch)) {
                return of$(false);
            }

            return observePermissionForChannel(database, ch, u, Permissions.CONVERT_PUBLIC_CHANNEL_TO_PRIVATE, false);
        }),
    );

    return {
        canConvert,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName))),
    };
});

export default withDatabase(enhanced(ConvertPrivate));
