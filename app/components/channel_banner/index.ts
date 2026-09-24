// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {ChannelBanner} from '@components/channel_banner/channel_banner';
import {observeChannel} from '@queries/servers/channel';
import {observeChannelAttributeBanner} from '@queries/servers/properties';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);

    // The channel emits on any column change and banner_info is re-parsed each
    // time, so without this every new post would rebuild the banner pipeline.
    const bannerInfo = channel.pipe(
        switchMap((c) => of$(c?.bannerInfo)),
        distinctUntilChanged((a, b) => a?.enabled === b?.enabled && a?.text === b?.text && a?.background_color === b?.background_color),
    );

    // Attribute-driven banners use banner_info as template/config storage even
    // while its native enabled flag is false.
    const attributeBanner = bannerInfo.pipe(
        switchMap((bi) => observeChannelAttributeBanner(database, channelId, bi?.text, bi?.background_color)),
    );

    return {
        bannerInfo,
        attributeBanner,
    };
});

export default withDatabase(enhanced(ChannelBanner));
