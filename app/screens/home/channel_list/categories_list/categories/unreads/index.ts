// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';
import {combineLatestWith, concatAll, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {getChannelById, observeAllMyChannelNotifyProps, queryMyChannelUnreads} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeLastUnreadChannelId} from '@queries/servers/system';

import {getChannelsFromRelation} from '../body';

import UnreadCategories from './unreads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
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

type NotifyProps = {
    [key: string]: Partial<ChannelNotifyProps>;
}

const mostRecentFirst = (a: MyChannelModel, b: MyChannelModel) => {
    return b.lastPostAt - a.lastPostAt;
};

/**
 * Filtering / Sorting:
 *
 * Unreads, Mentions, and Muted Mentions Only
 *
 * Mentions on top, then unreads, then muted channels with mentions.
 * Secondary sorting within each of those is by recent posting or by recent root post if CRT is enabled.
 */

type FilterAndSortMyChannelsArgs = [
    MyChannelModel[],
    NotifyProps,
]

const filterAndSortMyChannels = ([myChannels, notifyProps]: FilterAndSortMyChannelsArgs): MyChannelModel[] => {
    const mentions: MyChannelModel[] = [];
    const unreads: MyChannelModel[] = [];
    const mutedMentions: MyChannelModel[] = [];

    const isMuted = (id: string) => {
        return notifyProps[id]?.mark_unread === 'mention';
    };

    for (const myChannel of myChannels) {
        const id = myChannel.id;

        // is it a mention?
        if (!isMuted(id) && myChannel.mentionsCount > 0) {
            mentions.push(myChannel);
            continue;
        }

        // is it unread?
        if (!isMuted(myChannel.id) && myChannel.isUnread) {
            unreads.push(myChannel);
            continue;
        }

        // is it a muted mention?
        if (isMuted(myChannel.id) && myChannel.mentionsCount > 0) {
            mutedMentions.push(myChannel);
            continue;
        }
    }

    // Sort
    mentions.sort(mostRecentFirst);
    unreads.sort(mostRecentFirst);
    mutedMentions.sort(mostRecentFirst);

    return [...mentions, ...unreads, ...mutedMentions];
};

const enhanced = withObservables(['currentTeamId', 'isTablet', 'onlyUnreads'], ({currentTeamId, isTablet, database, onlyUnreads}: WithDatabaseProps) => {
    const unreadsOnTop = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of$(getPreferenceAsBool(prefs, Preferences.CATEGORY_SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS, false))),
        );

    const getC = (lastUnreadChannelId: string) => getChannelById(database, lastUnreadChannelId);

    const unreadChannels = unreadsOnTop.pipe(switchMap((gU) => {
        if (gU || onlyUnreads) {
            const lastUnread = isTablet ? observeLastUnreadChannelId(database).pipe(
                switchMap(getC),
            ) : of$('');
            const notifyProps = observeAllMyChannelNotifyProps(database);

            const unreads = queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at']).pipe(
                combineLatestWith(notifyProps),
                map(filterAndSortMyChannels),
                map(getChannelsFromRelation),
                concatAll(),
            );

            const combined = combineLatest([unreads, lastUnread]).pipe(
                switchMap(concatenateChannelsArray),
            );

            return combined;
        }
        return of$([]);
    }));
    return {
        unreadChannels,
    };
});

export default withDatabase(enhanced(UnreadCategories));
