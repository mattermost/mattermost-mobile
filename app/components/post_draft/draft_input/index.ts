// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue} from '@queries/servers/system';

import DraftInput from './draft_input';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const scheduledPostsEnabled = observeConfigBooleanValue(database, 'ScheduledPosts');
    return {
        scheduledPostsEnabled,
    };
});

export default withDatabase(enhanced(DraftInput));
