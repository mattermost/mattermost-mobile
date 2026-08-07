// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeSelectedAgentId} from '@agents/queries/agents';
import {observeChannel, observeMyChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';

import ChannelSummarySheet from './channel_summary_sheet';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

type OwnProps = {
    channelId: string;
};

// DM/GM channels have no team; fall back to the current team so the server
// can still set the LLM team context.
function channelTeamOrCurrent(database: Database, channel?: ChannelModel) {
    if (channel?.teamId) {
        return of$(channel.teamId);
    }
    return observeCurrentTeamId(database);
}

const enhanced = withObservables(['channelId'], ({database, channelId}: WithDatabaseArgs & OwnProps) => ({
    selectedAgentId: observeSelectedAgentId(database),

    // "Summarize unreads" bounds the analysis to messages since the user
    // last opened the channel; the server has no unreads concept of its own.
    // Entering the channel advances lastViewedAt to now, so use viewedAt —
    // the previous visit's timestamp that also drives the New Messages line.
    lastViewedAt: observeMyChannel(database, channelId).pipe(
        switchMap((myChannel) => of$(myChannel?.viewedAt || myChannel?.lastViewedAt || 0)),
    ),

    teamId: observeChannel(database, channelId).pipe(
        switchMap((channel) => channelTeamOrCurrent(database, channel ?? undefined)),
    ),
}));

export default withDatabase(enhanced(ChannelSummarySheet));
