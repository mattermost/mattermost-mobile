// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {queryActivePlaybookRunsPerChannel} from '@playbooks/queries/playbooks';

import PlaybookRunsOption from './playbook_runs_option';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    channelId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    return {
        playbooksActiveRuns: queryActivePlaybookRunsPerChannel(database, channelId).observeCount(),
    };
});

export default withDatabase(enhanced(PlaybookRunsOption));
