// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {DEFAULT_LOCALE} from '@i18n';
import {observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import Categories, {type Props as CategoriesProps} from './categories';
import {observeCategoryItems, observeFlattenedUnreads} from './helpers/observe_flattened_categories';

import type {WithDatabaseArgs} from '@typings/database/database';

type OuterProps = WithDatabaseArgs & Pick<CategoriesProps, 'isTablet' | 'headerButtons'>;

const enhanced = withObservables(['isTablet'], ({database, isTablet}: OuterProps) => {
    const currentTeamId = observeCurrentTeamId(database).pipe(distinctUntilChanged());
    const onlyUnreads = observeOnlyUnreads(database).pipe(distinctUntilChanged());
    const currentUser = observeCurrentUser(database).pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id && a?.locale === b?.locale),
    );

    const makeCategories = (teamId: string) => (isOnlyUnreads: boolean) => {
        if (isOnlyUnreads) {
            return observeFlattenedUnreads(database, teamId, isTablet);
        }
        return observeCategoryItems(database, teamId);
    };

    const categoriesData = currentTeamId.pipe(
        switchMap((teamId) => onlyUnreads.pipe(switchMap(makeCategories(teamId)))),
    );

    return {
        flattenedItems: categoriesData.pipe(map((data) => data.items)),
        unreadChannelIds: categoriesData.pipe(map((data) => data.unreadChannelIds)),
        onlyUnreads,
        currentUserId: currentUser.pipe(map((u) => u?.id ?? '')),
        locale: currentUser.pipe(map((u) => u?.locale ?? DEFAULT_LOCALE)),
    };
});

export default withDatabase(enhanced(Categories));
