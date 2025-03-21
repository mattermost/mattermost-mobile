// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import type {WithDatabaseArgs} from '@typings/database/database';
import {observeChannel} from '@queries/servers/channel';
import {switchMap} from 'rxjs/operators';
import {of as of$} from 'rxjs';
import {ChannelBanner} from '@screens/channel/header/channel_banner/channel_banner';
import {getLicense, observeLicense} from '@queries/servers/system';

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
