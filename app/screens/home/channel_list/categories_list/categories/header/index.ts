// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {combineLatestWith} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeCurrentChannelId} from '@queries/servers/system';

import CategoryHeader from './header';

import type CategoryModel from '@typings/database/models/servers/category';

const enhanced = withObservables(['category'], ({category}: {category: CategoryModel}) => {
    const canViewArchived = observeConfigBooleanValue(category.database, 'ExperimentalViewArchivedChannels');
    const currentChannelId = observeCurrentChannelId(category.database);

    return {
        category,
        hasChannels: canViewArchived.pipe(
            combineLatestWith(currentChannelId),
            switchMap(([canView, channelId]) => category.observeHasChannels(canView, channelId)),
        ),
    };
});

export default enhanced(CategoryHeader);
