// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES} from '@constants/database';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';

const {SERVER: {CATEGORY}} = MM_TABLES;

type WithDatabaseProps = {currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId'],
    ({currentTeamId, database}: WithDatabaseProps) => {
        const categories = database.get<CategoryModel>(CATEGORY).query(
            Q.where('team_id', currentTeamId),
        ).observeWithColumns(['sort_order']);

        return {
            categories,
        };
    });

export default withDatabase(enhanced(Categories));
