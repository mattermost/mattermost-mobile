// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import ChannelModel from '@typings/database/models/servers/channel';

import ChannelListItem from './channel_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['channel'], ({channel, database}: {channel: ChannelModel} & WithDatabaseArgs) => {
    const currentUserId = observeCurrentUserId(database);

    const myChannel = observeMyChannel(database, channel.id);

    let isMuted = of$(false);
    if (myChannel) {
        const settings = myChannel.pipe(
            switchMap((mc) => {
                return mc ? mc.settings.observe() : of$(undefined);
            }),
        );

        isMuted = settings?.pipe(
            switchMap((s) => of$(s?.notifyProps?.mark_unread === 'mention')),
        );
    }

    return {
        currentUserId,
        isMuted,
        myChannel,
        channel: channel.observe(),
    };
});

export default withDatabase(enhance(ChannelListItem));
