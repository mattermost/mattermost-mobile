// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map, shareReplay, switchMap} from 'rxjs/operators';

import {DEFAULT_LOCALE} from '@i18n';
import {observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import Categories from './categories';
import {observeFlattenedCategories} from './helpers/observe_flattened_categories';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    isTablet: boolean;
};

const enhanced = withObservables(['isTablet'], ({database, isTablet}: Props) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentUser = observeCurrentUser(database);
    const onlyUnreads = observeOnlyUnreads(database);

    // Only id and locale feed the sidebar; other user writes (status, avatar) must not rebuild it
    const userInfo = currentUser.pipe(
        map((user) => ({id: user?.id || '', locale: user?.locale || DEFAULT_LOCALE})),
        distinctUntilChanged((a, b) => a.id === b.id && a.locale === b.locale),
    );

    const categoriesData = combineLatest([userInfo, onlyUnreads, currentTeamId]).pipe(
        switchMap(([user, isOnlyUnreads, teamId]) => {
            return observeFlattenedCategories(
                database,
                user.id,
                user.locale,
                isTablet,
                isOnlyUnreads,
                teamId,
            );
        }),
        shareReplay({bufferSize: 1, refCount: true}),
    );

    const flattenedItems = categoriesData.pipe(map((data) => data.items));
    const unreadChannelIds = categoriesData.pipe(map((data) => data.unreadChannelIds));

    return {
        flattenedItems,
        unreadChannelIds,
        onlyUnreads,
        currentTeamId,
    };
});

export default withDatabase(enhanced(Categories));
