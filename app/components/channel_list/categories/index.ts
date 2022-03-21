// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import Categories from './categories';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {CATEGORY, SYSTEM}} = MM_TABLES;
const {CURRENT_CHANNEL_ID, CURRENT_USER_ID} = SYSTEM_IDENTIFIERS;

type WithDatabaseProps = {currentTeamId: string } & WithDatabaseArgs

const enhanced = withObservables(
    ['currentTeamId'],
    ({currentTeamId, database}: WithDatabaseProps) => {
        const currentChannelId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_CHANNEL_ID).pipe(
            switchMap(({value}) => of$(value)),
        );
        const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(CURRENT_USER_ID).pipe(
            switchMap(({value}) => of$(value)),
        );
        const categories = database.get<CategoryModel>(CATEGORY).query(
            Q.where('team_id', currentTeamId),
        ).observeWithColumns(['sort_order']);

        return {
            currentChannelId,
            categories,
            currentUserId,
        };
    });

export default withDatabase(enhanced(Categories));
