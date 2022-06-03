// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeCurrentChannelId, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserCustomStatus, getUserIdFromChannelName, isCustomStatusExpired as checkCustomStatusIsExpired} from '@utils/user';

import ChannelHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);
    const channelId = observeCurrentChannelId(database);
    const teamId = observeCurrentTeamId(database);

    const channel = channelId.pipe(
        switchMap((id) => observeChannel(database, id)),
    );

    const channelType = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelInfo = channelId.pipe(
        switchMap((id) => observeChannelInfo(database, id)),
    );

    const dmUser = currentUserId.pipe(
        combineLatestWith(channel),
        switchMap(([userId, c]) => {
            if (c?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(userId, c.name);
                return observeUser(database, teammateId);
            }

            return of$(undefined);
        }),
    );

    const isOwnDirectMessage = currentUserId.pipe(
        combineLatestWith(dmUser),
        switchMap(([userId, dm]) => of$(userId === dm?.id)),
    );

    const customStatus = dmUser.pipe(
        switchMap((dm) => of$(getUserCustomStatus(dm))),
    );

    const isCustomStatusExpired = dmUser.pipe(
        switchMap((dm) => of$(checkCustomStatusIsExpired(dm))),
    );

    const searchTerm = channel.pipe(
        combineLatestWith(dmUser),
        switchMap(([c, dm]) => {
            if (c?.type === General.DM_CHANNEL) {
                return of$(dm ? `@${dm.username}` : '');
            } else if (c?.type === General.GM_CHANNEL) {
                return of$(`@${c.name}`);
            }

            return of$(c?.name);
        }),
    );

    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));
    const memberCount = channelInfo.pipe(
        combineLatestWith(dmUser),
        switchMap(([ci, dm]) => of$(dm ? undefined : ci?.memberCount)));

    return {
        channelId,
        channelType,
        customStatus,
        displayName,
        isCustomStatusExpired,
        isOwnDirectMessage,
        memberCount,
        searchTerm,
        teamId,
    };
});

export default withDatabase(enhanced(ChannelHeader));
