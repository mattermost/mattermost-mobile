// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {DEFAULT_LOCALE} from '@i18n';
import {observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import Categories, {type Props as CategoriesProps} from './categories';
import {type FlattenedItem} from './helpers/flattened_item';
import {observeCategoryItems, observeFlattenedUnreads, type FlattenedCategoriesData} from './helpers/observe_flattened_categories';

import type {WithDatabaseArgs} from '@typings/database/database';

type OuterProps = WithDatabaseArgs & Pick<CategoriesProps, 'isTablet' | 'headerButtons'> & {
    unreadsOnTop: boolean;
};

const UNREADS_HEADER_ITEM: FlattenedItem = {type: 'unreads_header'};

const enhanced = withObservables(['isTablet', 'unreadsOnTop'], ({database, isTablet, unreadsOnTop}: OuterProps) => {
    const currentTeamId = observeCurrentTeamId(database).pipe(distinctUntilChanged());

    // unreadsOnTop and the "only unreads" filter are mutually exclusive UI modes; the filter's own toggle
    // button is hidden while unreadsOnTop is on (see subheader.tsx), so its stored value must be ignored
    // here too, or the list can get stuck showing only unreads with no visible way to turn it back off.
    const onlyUnreads = observeOnlyUnreads(database).pipe(
        map((isOnlyUnreads) => isOnlyUnreads && !unreadsOnTop),
        distinctUntilChanged(),
    );
    const currentUser = observeCurrentUser(database).pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id && a?.locale === b?.locale),
    );

    const makeCategories = (teamId: string) => (isOnlyUnreads: boolean): ReturnType<typeof observeCategoryItems> => {
        if (isOnlyUnreads) {
            return observeFlattenedUnreads(database, teamId, isTablet);
        }

        const categoryItems = observeCategoryItems(database, teamId);
        if (!unreadsOnTop) {
            return categoryItems;
        }

        const unreadsRollup = observeFlattenedUnreads(database, teamId, isTablet);
        return combineLatest([unreadsRollup, categoryItems]).pipe(
            map(([rollup, categories]): FlattenedCategoriesData => ({
                items: rollup.items.length ? [UNREADS_HEADER_ITEM, ...rollup.items, ...categories.items] : categories.items,
                unreadChannelIds: rollup.unreadChannelIds,
            })),
        );
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
