// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {ChannelBanner} from '@components/channel_banner/channel_banner';
import {observeChannel} from '@queries/servers/channel';
import {observeChannelAttributeBanner} from '@queries/servers/properties';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const bannerInfo = channel.pipe(switchMap((c) => of$(c?.bannerInfo)));

    // The channel's own banner_info supplies both the text and the authored
    // colour: a designated attribute renders text composed per channel, and the
    // colour chosen alongside it wins over the option's.
    //
    // The colour is only honoured while that banner is enabled. A disabled banner
    // can still hold a stale colour, and letting it through would paint the
    // attribute banner with a colour nobody chose for it.
    const attributeBanner = bannerInfo.pipe(
        switchMap((bi) => observeChannelAttributeBanner(database, channelId, bi?.text, bi?.enabled ? bi.background_color : undefined)),
    );

    return {
        bannerInfo,
        attributeBanner,
    };
});

export default withDatabase(enhanced(ChannelBanner));
