// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of, switchMap} from 'rxjs';

import {observeScheduledPostCountForChannel, observeScheduledPostCountForThread} from '@queries/servers/scheduled_post';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import {ScheduledPostIndicator} from './scheduled_post_indicator';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId?: string;
    rootId?: string;
}

const enhance = withObservables(['channelId', 'rootId'], ({database, channelId, rootId}: Props) => {
    const isCRTEnabled = observeIsCRTEnabled(database);

    let scheduledPostCount = of(0);
    if (rootId) {
        scheduledPostCount = observeScheduledPostCountForThread(database, rootId);
    } else if (channelId) {
        scheduledPostCount = isCRTEnabled.pipe(switchMap((isCRT) => observeScheduledPostCountForChannel(database, channelId, isCRT)));
    }

    return {
        scheduledPostCount,
        isCRTEnabled,
    };
});

export default withDatabase(enhance(ScheduledPostIndicator));
