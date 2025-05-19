// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeScheduledPostEnabled} from '@queries/servers/scheduled_post';

import DraftInput from './draft_input';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const scheduledPostsEnabled = observeScheduledPostEnabled(database);
    return {
        scheduledPostsEnabled,
    };
});

export default withDatabase(enhanced(DraftInput));
