// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$, switchMap} from 'rxjs';

import {Permissions} from '@constants';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';

import CreateOrEditChannel from './create_or_edit_channel';

import type {WithDatabaseArgs} from '@typings/database/database';

export type CreateOrEditChannelProps = {
    channelId?: string;
}

const enhanced = withObservables([], ({database, channelId}: WithDatabaseArgs & CreateOrEditChannelProps) => {
    const channel = channelId ? observeChannel(database, channelId) : of$(undefined);
    const channelInfo = channelId ? observeChannelInfo(database, channelId) : of$(undefined);

    const currentTeam = observeCurrentTeam(database);
    const currentUser = observeCurrentUser(database);

    const canCreatePublicChannels = combineLatest([currentUser, currentTeam]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, currentTeam]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    return {
        canCreatePublicChannels,
        canCreatePrivateChannels,
        channel,
        channelInfo,
    };
});

export default withDatabase(enhanced(CreateOrEditChannel));
