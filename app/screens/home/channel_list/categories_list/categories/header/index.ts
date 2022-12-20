// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue} from '@queries/servers/system';

import CategoryHeader from './header';

import type CategoryModel from '@typings/database/models/servers/category';

const enhanced = withObservables(['category'], ({category}: {category: CategoryModel}) => {
    const canViewArchived = observeConfigBooleanValue(category.database, 'ExperimentalViewArchivedChannels');

    return {
        category,
        hasChannels: canViewArchived.pipe(
            switchMap((canView) => category.observeHasChannels(canView)),
        ),
    };
});

export default enhanced(CategoryHeader);
