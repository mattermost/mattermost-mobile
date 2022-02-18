// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeCurrentChannelId, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const channelId = observeCurrentChannelId(database);
    const teamId = observeCurrentTeamId(database);

    const channel = channelId.pipe(
        switchMap((id) => observeChannel(database, id)),
    );

    const channelInfo = channelId.pipe(
        switchMap((id) => observeChannelInfo(database, id)),
    );

    const isOwnDirectMessage = combineLatest([currentUserId, channel]).pipe(
        switchMap(([userId, ch]) => {
            if (ch?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(userId, ch.name);
                return of$(userId === teammateId);
            }

            return of$(false);
        }),
    );

    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const name = combineLatest([currentUserId, channel]).pipe(switchMap(([userId, c]) => {
        if (c?.type === General.DM_CHANNEL) {
            const teammateId = getUserIdFromChannelName(userId, c.name);
            return observeUser(database, teammateId).pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((u) => (u ? of$(`@${u.username}`) : of$('Someone'))),
            );
        } else if (c?.type === General.GM_CHANNEL) {
            return of$(`@${c.name}`);
        }

        return of$(c?.name);
    }));
    const memberCount = channelInfo.pipe(switchMap((ci) => of$(ci?.memberCount || 0)));

    return {
        channelId,
        displayName,
        isOwnDirectMessage,
        memberCount,
        name,
        teamId,
    };
});

export default withDatabase(enhanced(Channel));
