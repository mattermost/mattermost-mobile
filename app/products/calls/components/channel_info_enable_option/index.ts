// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import ChannelInfoEnableDisable from '@calls/components/channel_info_enable_option/channel_info_enable_disable';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeUserIsChannelAdmin} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: EnhanceProps) => {
    const channel = observeChannel(database, channelId);
    const channelAdmin = observeCurrentUserId(database).pipe(
        switchMap((id) => observeUserIsChannelAdmin(database, id, channelId)),
    );
    const systemAdmin = observeCurrentUser(database).pipe(
        switchMap((u) => (u ? of$(u.roles) : of$(''))),
        switchMap((roles) => of$(isSystemAdmin(roles || ''))),
    );

    return {
        channel,
        channelAdmin,
        systemAdmin,
    };
});

export default withDatabase(enhanced(ChannelInfoEnableDisable));
