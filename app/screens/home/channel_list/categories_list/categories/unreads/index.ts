// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {combineLatestWith, map, switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {getChannelById, observeChannelsByLastPostAt, observeNotifyPropsByChannels, queryMyChannelUnreads} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeLastUnreadChannelId} from '@queries/servers/system';

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

type NotifyProps = {
    [key: string]: Partial<ChannelNotifyProps>;
}

/**
 * Filtering / Sorting:
 *
 * Unreads, Mentions, and Muted Mentions Only
 * Mentions on top, then unreads, then muted channels with mentions.
 */

 type FilterAndSortMyChannelsArgs = [
    MyChannelModel[],
    Record<string, ChannelModel>,
    NotifyProps,
]

const concatenateChannelsArray = ([a, b]: CA) => {
    return of$(b ? a.filter((c) => c && c.id !== b.id).concat(b) : a);
};

const filterAndSortMyChannels = ([myChannels, channels, notifyProps]: FilterAndSortMyChannelsArgs): ChannelModel[] => {
    const mentions: ChannelModel[] = [];
    const unreads: ChannelModel[] = [];
    const mutedMentions: ChannelModel[] = [];

    const isMuted = (id: string) => {
        return notifyProps[id]?.mark_unread === 'mention';
    };

    for (const myChannel of myChannels) {
        const id = myChannel.id;

        // is it a mention?
        if (!isMuted(id) && myChannel.mentionsCount > 0 && channels[id]) {
            mentions.push(channels[id]);
            continue;
        }

        // is it unread?
        if (!isMuted(myChannel.id) && myChannel.isUnread && channels[id]) {
            unreads.push(channels[id]);
            continue;
        }

        // is it a muted mention?
        if (isMuted(myChannel.id) && myChannel.mentionsCount > 0 && channels[id]) {
            mutedMentions.push(channels[id]);
            continue;
        }
    }

    return [...mentions, ...unreads, ...mutedMentions];
};

const makeChannelsMap = (channels: ChannelModel[]) => {
    return channels.reduce<Record<string, ChannelModel>>((result, c) => {
        result[c.id] = c;
        return result;
    }, {});
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
            const lastUnread = isTablet ? observeLastUnreadChannelId(database).pipe(switchMap(getC)) : of$(undefined);
            const myUnreadChannels = queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at']);
            const notifyProps = myUnreadChannels.pipe(switchMap((cs) => observeNotifyPropsByChannels(database, cs)));
            const channels = myUnreadChannels.pipe(switchMap((myChannels) => observeChannelsByLastPostAt(database, myChannels)));
            const channelsMap = channels.pipe(switchMap((cs) => of$(makeChannelsMap(cs))));

            return queryMyChannelUnreads(database, currentTeamId).observeWithColumns(['last_post_at']).pipe(
                combineLatestWith(channelsMap, notifyProps),
                map(filterAndSortMyChannels),
                combineLatestWith(lastUnread),
                switchMap(concatenateChannelsArray),
            );
        }
        return of$([]);
    }));
    return {
        unreadChannels,
    };
});

export default withDatabase(enhanced(UnreadCategories));
