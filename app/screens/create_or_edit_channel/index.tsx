// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$, switchMap} from 'rxjs';

import {Permissions} from '@constants';
import {observeChannel, observeChannelInfo} from '@queries/servers/channel';
import {observeChannelAttributeCreationBlocked, observeCreatableChannelAttributeFields} from '@queries/servers/channel_attributes';
import {observeChannelAttributesEnabled} from '@queries/servers/properties';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeCurrentTeam} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {type ChannelAttributeField} from '@utils/channel_attributes';

import CreateOrEditChannel from './create_or_edit_channel';

import type {WithDatabaseArgs} from '@typings/database/database';

export type CreateOrEditChannelProps = {
    channelId?: string;
}

const EMPTY_FIELDS: ChannelAttributeField[] = [];

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

    // Editing an existing channel never offers this section (decision: no
    // attribute editing from the Edit Channel screen), so there is nothing to
    // gain from subscribing to it there.
    const attributesEnabled = channelId ? of$(false) : observeChannelAttributesEnabled(database);

    const attributeFields = channelId ? of$(EMPTY_FIELDS) : attributesEnabled.pipe(
        switchMap((enabled) => (enabled ? observeCreatableChannelAttributeFields(database) : of$(EMPTY_FIELDS))),
    );

    const attributesBlocked = channelId ? of$(false) : attributesEnabled.pipe(
        switchMap((enabled) => (enabled ? observeChannelAttributeCreationBlocked(database) : of$(false))),
    );

    return {
        canCreatePublicChannels,
        canCreatePrivateChannels,
        channel,
        channelInfo,
        attributeFields,
        attributesBlocked,
    };
});

export default withDatabase(enhanced(CreateOrEditChannel));
