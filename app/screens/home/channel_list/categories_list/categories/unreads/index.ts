// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {filterAndSortMyChannels, makeChannelsMap} from '@helpers/database';
import {getChannelById, observeChannelsByLastPostAt, observeNotifyPropsByChannels, queryMyChannelUnreads} from '@queries/servers/channel';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeLastUnreadChannelId} from '@queries/servers/system';
import {observeUnreadsAndMentions} from '@queries/servers/thread';

import UnreadCategories from './unreads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PreferenceModel from '@typings/database/models/servers/preference';

type WithDatabaseProps = WithDatabaseArgs & {
    currentTeamId: string;
    isTablet: boolean;
    onlyUnreads: boolean;
}

type CA = [
    a: Array<ChannelModel | null>,
    b: ChannelModel | undefined,
]

const concatenateChannelsArray = ([a, b]: CA) => {
    return of$(b ? a.filter((c) => c && c.id !== b.id).concat(b) : a);
};

const enhanced = withObservables(['currentTeamId', 'isTablet', 'onlyUnreads'], ({currentTeamId, isTablet, database, onlyUnreads}: WithDatabaseProps) => {
    const unreadsOnTop = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
        );

    const getC = (lastUnreadChannelId: string) => getChannelById(database, lastUnreadChannelId);

    const unreadChannels = unreadsOnTop.pipe(switchMap((gU) => {
        if (gU || onlyUnreads) {
            const lastUnread = isTablet ? observeLastUnreadChannelId(database).pipe(
                switchMap(getC),
            ) : of$(undefined);
            const myUnreadChannels = queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at', 'is_unread']);
            const notifyProps = myUnreadChannels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
            const channels = myUnreadChannels.pipe(switchMap((myChannels) => observeChannelsByLastPostAt(database, myChannels)));
            const channelsMap = channels.pipe(switchMap((cs) => of$(makeChannelsMap(cs))));

            return myUnreadChannels.pipe(
                combineLatestWith(channelsMap, notifyProps),
                map(filterAndSortMyChannels),
                combineLatestWith(lastUnread),
                switchMap(concatenateChannelsArray),
            );
        }
        return of$([]);
    }));
    const unreadThreads = observeUnreadsAndMentions(database, {teamId: currentTeamId, includeDmGm: true});

    return {
        unreadChannels,
        unreadThreads,
    };
});

export default withDatabase(enhanced(UnreadCategories));
