// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, startWith, switchMap} from 'rxjs/operators';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeIsAgentsAnalysisLicensed} from '@agents/queries/license';
import {filterAgentsForChannel} from '@agents/utils';
import {Screens} from '@constants';

import NewMessagesLine from './new_message_line';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
    location: AvailableScreens;
};

// This renders in the hot post list, so the gating stays cheap: a single
// boolean observable per separator instance (the separator appears at most
// once per channel view). Ask AI only applies to the channel view (webapp
// parity: it registers on the channel New Messages line), and only when
// analysis is licensed and at least one agent is usable in this channel.
// startWith(false) keeps the first paint synchronous, identical to the
// pill-less separator, while the DB observables resolve.
const enhanced = withObservables(['channelId', 'location'], ({channelId, location, database}: OwnProps) => ({
    canSummarizeUnreads: location === Screens.CHANNEL ? combineLatest([
        observeIsAgentsAnalysisLicensed(database),
        observeAIBots(database),
    ]).pipe(
        switchMap(([licensed, bots]) => of$(licensed && filterAgentsForChannel(bots, channelId).length > 0)),
        startWith(false),
        distinctUntilChanged(),
    ) : of$(false),
}));

export default withDatabase(enhanced(NewMessagesLine));
