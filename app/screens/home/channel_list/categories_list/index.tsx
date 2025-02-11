// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeCurrentTeamId} from '@queries/servers/system';

import CategoriesList from './categories_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enchanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count

    // eslint-disable-next-line no-warning-comments
    // TODO: this hardcoded count will be removed from the final implementation once integrated with database
    const scheduledPostCount = of(10);
    const scheduledPostHasError = of(false);

    return {
        draftsCount,
        scheduledPostCount,
        scheduledPostHasError,
    };
});

export default withDatabase(enchanced(CategoriesList));
