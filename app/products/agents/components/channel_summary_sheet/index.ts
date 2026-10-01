// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeSelectedAgentId} from '@agents/queries/agents';
import {observeMyChannel} from '@queries/servers/channel';

import ChannelSummarySheet from './channel_summary_sheet';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
};

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & OwnProps) => ({
    bots: observeAIBots(database),
    selectedAgentId: observeSelectedAgentId(database),

    // "Summarize unreads" bounds the analysis to messages since the user
    // last opened the channel. Entering the channel already advanced
    // lastViewedAt to "now", so observe viewedAt — the previous visit's
    // timestamp that also drives the New Messages line.
    viewedAt: observeMyChannel(database, channelId).pipe(
        map((myChannel) => myChannel?.viewedAt ?? 0),
        distinctUntilChanged(),
    ),
}));

export default withDatabase(enhanced(ChannelSummarySheet));
