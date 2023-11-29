// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeGlobalThreadsTab} from '@queries/servers/system';

import GlobalThreads from './global_threads';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        globalThreadsTab: observeGlobalThreadsTab(database),
    };
});

export default withDatabase(enhanced(GlobalThreads));
