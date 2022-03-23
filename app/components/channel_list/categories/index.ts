// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';

type WithDatabaseProps = {currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId'],
    ({currentTeamId, database}: WithDatabaseProps) => {
        const currentChannelId = observeCurrentChannelId(database);
        const currentUserId = observeCurrentUserId(database);
        const categories = queryCategoriesByTeamIds(database, [currentTeamId]).observeWithColumns(['sort_order']);

        return {
            currentChannelId,
            categories,
            currentUserId,
        };
    });

export default withDatabase(enhanced(Categories));
