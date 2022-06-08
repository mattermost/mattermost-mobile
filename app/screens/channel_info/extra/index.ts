// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeCurrentUser, observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {displayUsername, getUserCustomStatus, getUserIdFromChannelName, isCustomStatusExpired as checkCustomStatusIsExpired} from '@utils/user';

import Extra from './extra';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUser = observeCurrentUser(database);
    const teammateNameDisplay = observeTeammateNameDisplay(database);
    const channel = observeChannel(database, channelId);
    const channelInfo = observeChannelInfo(database, channelId);
    const createdAt = channel.pipe(switchMap((c) => of$(c?.type === General.DM_CHANNEL ? 0 : c?.createAt)));
    const header = channelInfo.pipe(switchMap((ci) => of$(ci?.header)));
    const dmUser = currentUser.pipe(
        combineLatestWith(channel),
        switchMap(([user, c]) => {
            if (c?.type === General.DM_CHANNEL && user) {
                const teammateId = getUserIdFromChannelName(user.id, c.name);
                return observeUser(database, teammateId);
            }

            return of$(undefined);
        }),
    );

    const createdBy = channel.pipe(
        switchMap((ch) => (ch?.creatorId ? ch.creator.observe() : of$(undefined))),
        combineLatestWith(currentUser, teammateNameDisplay),
        switchMap(([creator, me, disaplySetting]) => of$(displayUsername(creator, me?.locale, disaplySetting, false))),
    );

    const customStatus = dmUser.pipe(
        switchMap((dm) => of$(checkCustomStatusIsExpired(dm) ? undefined : getUserCustomStatus(dm))),
    );

    return {
        createdAt,
        createdBy,
        customStatus,
        header,
    };
});

export default withDatabase(enhanced(Extra));
