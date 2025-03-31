// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeLicense} from '@queries/servers/system';
import {ChannelBanner} from '@screens/channel/header/channel_banner/channel_banner';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const channelType = channel.pipe(switchMap((c) => of$(c?.type)));
    const bannerInfo = channel.pipe(switchMap((c) => of$(c?.bannerInfo)));

    const license = observeLicense(database);

    return {
        channelType,
        bannerInfo,
        license,
    };
});

export default withDatabase(enhanced(ChannelBanner));
