// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryPlaybookRunsPerChannel} from '@playbooks/database/queries/run';

import PlaybookRuns from './playbook_runs';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    return {
        allRuns: queryPlaybookRunsPerChannel(database, channelId).observeWithColumns(['end_at']),
    };
});

export default withDatabase(enhanced(PlaybookRuns));
