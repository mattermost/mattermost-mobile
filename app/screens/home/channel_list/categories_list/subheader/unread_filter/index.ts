// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeOnlyUnreads} from '@queries/servers/system';

import UnreadFilter from './unread_filter';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    onlyUnreads: observeOnlyUnreads(database),
}));

export default withDatabase(enhanced(UnreadFilter));
