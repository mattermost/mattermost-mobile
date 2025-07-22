// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookRunsPerChannel} from '@playbooks/database/queries/run';
import {observeChannel} from '@queries/servers/channel';

import PlaybookRunsOption from './playbook_runs_option';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    return {
        playbooksActiveRuns: queryPlaybookRunsPerChannel(database, channelId, false).observeCount(false),
        channelName: observeChannel(database, channelId).pipe(
            switchMap((channel) => of$(channel?.displayName || '')),
        ),
    };
});

export default withDatabase(enhanced(PlaybookRunsOption));
