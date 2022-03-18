// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getUserIdFromChannelName} from '@utils/user';

import ChannelListItem from './channel_list_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {MY_CHANNEL, SYSTEM}} = MM_TABLES;
const {CURRENT_USER_ID} = SYSTEM_IDENTIFIERS;

const enhance = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const myChannel = database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId);
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const channel = myChannel.pipe(switchMap((my) => my.channel.observe()));
    const settings = channel.pipe(switchMap((c) => c.settings.observe()));

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
            switchMap((s: MyChannelSettingsModel) => of$(s.notifyProps?.mark_unread === 'mention')),
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
