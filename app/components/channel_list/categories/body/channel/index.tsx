// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

const {SERVER: {CHANNEL}} = MM_TABLES;

import ChannelListItem from './channel_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

type WithDatabaseProps = {channelId: string } & WithDatabaseArgs

// const withChannel = withObservables(
//     ['channelId'],
//     ({channelId, database}: WithDatabaseProps) => {
//         const channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);

//         return {
//             channel,
//         };
//     });

// export default withDatabase(withChannel(ChannelListItem));

const withChannel = withObservables(['channel'], ({channel}: {channel: ChannelModel}) => ({
    channel,
}));

export default withChannel(ChannelListItem);
