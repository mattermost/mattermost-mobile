// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {queryAllMyChannel} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';

import UnfilteredList from './unfiltered_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const {CHANNEL} = MM_TABLES.SERVER;
const MAX_UNREAD_CHANNELS = 10;
const MAX_CHANNELS = 20;

const observeChannels = async (myChannels: MyChannelModel[]) => {
    const channels = await Promise.all(myChannels.map((m) => m.channel.fetch()));
    return channels.filter((c): c is ChannelModel => c !== null);
};

const queryMyChannelsByUnread = (database: Database, isUnread: boolean, sortBy: 'last_viewed_at' | 'last_post_at', take = MAX_CHANNELS, excludeIds?: string[]) => {
    const clause: Q.Clause[] = [Q.where('is_unread', Q.eq(isUnread))];

    if (excludeIds?.length) {
        clause.push(Q.where('id', Q.notIn(excludeIds)));
    }

    return queryAllMyChannel(database).extend(
        Q.on(CHANNEL, Q.where('delete_at', Q.eq(0))),
        ...clause,
        Q.sortBy(sortBy, Q.desc),
        Q.take(take),
    );
};

const observeRecentChannels = (database: Database, unreads: ChannelModel[]) => {
    const count = MAX_CHANNELS - unreads.length;
    const unreadIds = unreads.map((u) => u.id);
    return queryMyChannelsByUnread(database, false, 'last_viewed_at', count, unreadIds).observe().pipe(
        switchMap((myChannels) => observeChannels(myChannels)),
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teamsCount = queryJoinedTeams(database).observeCount();

    const unreadChannels = queryMyChannelsByUnread(database, true, 'last_post_at', MAX_UNREAD_CHANNELS).
        observeWithColumns(['last_post_at']).pipe(
            switchMap((myChannels) => observeChannels(myChannels)),
        );

    const recentChannels = unreadChannels.pipe(
        switchMap((unreads) => {
            if (unreads.length < MAX_UNREAD_CHANNELS) {
                return observeRecentChannels(database, unreads);
            }

            return of$([]);
        }),
    );

    return {
        recentChannels,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
        unreadChannels,
    };
});

export default withDatabase(enhanced(UnfilteredList));
