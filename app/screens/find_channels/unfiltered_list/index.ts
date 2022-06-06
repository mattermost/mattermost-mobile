// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, map, switchMap} from 'rxjs/operators';

import {filterAndSortMyChannels, makeChannelsMap} from '@helpers/database';
import {observeNotifyPropsByChannels, queryMyChannelsByUnread} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';
import {retrieveChannels} from '@screens/find_channels/utils';

import UnfilteredList from './unfiltered_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const MAX_UNREAD_CHANNELS = 10;
const MAX_CHANNELS = 20;

const observeRecentChannels = (database: Database, unreads: ChannelModel[]) => {
    const count = MAX_CHANNELS - unreads.length;
    const unreadIds = unreads.map((u) => u.id);
    return queryMyChannelsByUnread(database, false, 'last_viewed_at', count, unreadIds).observe().pipe(
        switchMap((myChannels) => retrieveChannels(database, myChannels, true)),
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teamsCount = queryJoinedTeams(database).observeCount();

    const myUnreadChannels = queryMyChannelsByUnread(database, true, 'last_post_at', 0).
        observeWithColumns(['last_post_at']);
    const notifyProps = myUnreadChannels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
    const channels = myUnreadChannels.pipe(
        switchMap((myChannels) => retrieveChannels(database, myChannels)),
    );
    const channelsMap = channels.pipe(switchMap((cs) => of$(makeChannelsMap(cs))));
    const unreadChannels = myUnreadChannels.pipe(
        combineLatestWith(channelsMap, notifyProps),
        map(filterAndSortMyChannels),
        switchMap((cs) => of$(cs.slice(0, MAX_UNREAD_CHANNELS))),
    );

    const recentChannels = unreadChannels.pipe(
        switchMap((unreads) => observeRecentChannels(database, unreads)),
    );

    return {
        recentChannels,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
        unreadChannels,
    };
});

export default withDatabase(enhanced(UnfilteredList));
