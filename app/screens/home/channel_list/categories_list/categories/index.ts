// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap, combineLatestWith} from 'rxjs/operators';

import {DEFAULT_LOCALE} from '@i18n';
import {observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import Categories from './categories';
import {observeFlattenedCategories} from './utils/observe_flattened_categories';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    isTablet: boolean;
};

const enhanced = withObservables(['isTablet'], ({database, isTablet}: Props) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentUser = observeCurrentUser(database);
    const onlyUnreads = observeOnlyUnreads(database);

    const flattenedItems = currentUser.pipe(
        combineLatestWith(onlyUnreads, currentTeamId),
        switchMap(([user, isOnlyUnreads, teamId]) => {
            return observeFlattenedCategories(
                database,
                user?.id || '',
                user?.locale || DEFAULT_LOCALE,
                isTablet,
                isOnlyUnreads,
                teamId,
            );
        }),
    );

    return {
        flattenedItems,
        onlyUnreads,
        currentTeamId,
    };
});

export default withDatabase(enhanced(Categories));
