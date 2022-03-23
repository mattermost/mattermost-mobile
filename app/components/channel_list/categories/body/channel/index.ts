// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeMyChannel} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {getUserIdFromChannelName} from '@utils/user';

import ChannelListItem from './channel_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

const enhance = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const myChannel = observeMyChannel(database, channelId);
    const currentUserId = observeCurrentUserId(database);

    const channel = myChannel.pipe(switchMap((my) => (my ? my.channel.observe() : of$(undefined))));
    const settings = channel.pipe(switchMap((c) => (c ? c.settings.observe() : of$(undefined))));

    const isOwnDirectMessage = combineLatest([currentUserId, channel]).pipe(
        switchMap(([userId, ch]) => {
            if (ch?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(userId, ch.name);
                return of$(userId === teammateId);
            }

            return of$(false);
        }),
    );
    return {
        isOwnDirectMessage,
        isMuted: settings.pipe(
            switchMap((s) => of$(s?.notifyProps?.mark_unread === 'mention')),
        ),
        myChannel,
        channel: channel.pipe(
            switchMap((c: ChannelModel) => of$({
                deleteAt: c.deleteAt,
                displayName: c.displayName,
                name: c.name,
                shared: c.shared,
                type: c.type,
            })),
        ),
    };
});

export default withDatabase(enhance(ChannelListItem));
