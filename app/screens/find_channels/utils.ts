// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {Observable, of as of$, switchMap} from 'rxjs';

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const {SERVER: {CHANNEL, MY_CHANNEL}} = MM_TABLES;

export const retrieveChannels = (database: Database, myChannels: MyChannelModel[], orderedByLastViewedAt = false) => {
    const ids = myChannels.map((m) => m.id);
    if (ids.length) {
        const idsStr = `'${ids.join("','")}'`;
        const order = orderedByLastViewedAt ? 'order by my.last_viewed_at desc' : '';
        return database.get<ChannelModel>(CHANNEL).query(
            Q.unsafeSqlQuery(`select distinct c.* from ${MY_CHANNEL} my
            inner join ${CHANNEL} c on c.id=my.id and c.id in (${idsStr})
            ${order}`),
        ).observe();
    }

    return of$([]);
};

export const removeChannelsFromArchivedTeams = (recentChannels: ChannelModel[], teamIds: Observable<Set<string>>) => {
    return teamIds.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((teamIdsSet) =>
            // eslint-disable-next-line max-nested-callbacks
            of$(recentChannels.filter((channel) => {
                if (!channel.teamId) {
                    return true;
                }
                return teamIdsSet.has(channel.teamId);
            })),
        ),
    );
};
