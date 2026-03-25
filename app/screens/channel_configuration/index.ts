// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeCanManageChannelAutotranslations, observeCanManageSharedChannel} from '@queries/servers/role';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelConfiguration from './channel_configuration';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const currentUser = observeCurrentUser(database);

    const canManageAutotranslations = currentUser.pipe(
        switchMap((u) => (u ? observeCanManageChannelAutotranslations(database, channelId, u) : of$(false))),
    );

    const sharedChannelsEnabled = observeConfigBooleanValue(database, 'ExperimentalSharedChannels');
    const canManageSharedChannel = currentUser.pipe(
        switchMap((u) => (u ? observeCanManageSharedChannel(database, channelId, u) : of$(false))),
    );
    const canManageSharedChannelWithFeature = combineLatest([canManageSharedChannel, sharedChannelsEnabled]).pipe(
        map(([canManage, enabled]) => canManage && enabled),
    );
    const isChannelShared = channel.pipe(switchMap((c) => of$(c?.shared ?? false)));

    return {
        canManageAutotranslations,
        canManageSharedChannel: canManageSharedChannelWithFeature,
        displayName: channel.pipe(switchMap((c) => of$(c?.displayName || ''))),
        isChannelShared,
    };
});

export default withDatabase(enhanced(ChannelConfiguration));
