// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map} from 'rxjs/operators';

import {withNonBlockingObservables} from '@database/components/with_non_blocking_observables';
import {queryChannelsById, queryMyChannelsByChannelIds} from '@queries/servers/channel';

import Category, {type Props} from './category';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

type OuterProps = WithDatabaseArgs & Omit<Props, 'myChannels' | 'channels' | 'categoryState'> & {
    channelIds: string[];
};

const enhanced = withNonBlockingObservables(
    ['category', 'channelIds'],
    ({database, category, channelIds}: OuterProps) => ({
        myChannels: channelIds.length ? queryMyChannelsByChannelIds(database, channelIds).observeWithColumns(['last_post_at', 'is_unread']) : of$<MyChannelModel[]>([]),
        channels: channelIds.length ? queryChannelsById(database, channelIds).observeWithColumns(['create_at', 'display_name', 'delete_at']) : of$<ChannelModel[]>([]),
        categoryState: category.observe().pipe(map((c) => ({collapsed: c.collapsed, sorting: c.sorting}))),
    }),
);

export default withDatabase(enhanced(Category));
