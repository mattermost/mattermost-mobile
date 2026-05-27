// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, switchMap, of as of$} from 'rxjs';

import {observeCallStateInChannel} from '@calls/observers';
import {withServerUrl} from '@context/server';
import {observeChannel} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';
import {observeScheduledPostCountForThread} from '@queries/servers/scheduled_post';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeChannelBannerIncluded} from '@screens/channel/channel_feature_checks';
import EphemeralStore from '@store/ephemeral_store';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
    rootId: string;
}

const enhanced = withObservables(['rootId'], ({database, serverUrl, rootId}: EnhanceProps) => {
    const rId = rootId || EphemeralStore.getCurrentThreadId();
    const rootPost = observePost(database, rId);

    const channelId = rootPost.pipe(
        switchMap((r) => of$(r?.channelId || '')),
        distinctUntilChanged(),
    );

    const channel = channelId.pipe(
        switchMap((cId) => observeChannel(database, cId)),
    );

    const channelType = channel.pipe(
        switchMap((c) => of$(c?.type)),
    );

    const includeChannelBanner = observeChannelBannerIncluded(database, channelType, channelId);

    const scheduledPostCount = observeScheduledPostCountForThread(database, rootId);

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        ...observeCallStateInChannel(serverUrl, database, channelId),
        rootId: of$(rId),
        rootPost,
        includeChannelBanner,
        scheduledPostCount,
    };
});

export default withDatabase(withServerUrl(enhanced(Thread)));
