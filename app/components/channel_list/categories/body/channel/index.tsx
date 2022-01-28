// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

const {SERVER: {MY_CHANNEL}} = MM_TABLES;

import ChannelListItem from './channel_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const enhance = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const myChannel = database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId);
    return {
        myChannel,
        channel: myChannel.pipe(
            switchMap((my) => my.channel.observe().
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((c: ChannelModel) => of$({
                        displayName: c.displayName,
                        type: c.type,
                    })),
                ),
            ),
        ),
    };
});

export default withDatabase(enhance(ChannelListItem));
