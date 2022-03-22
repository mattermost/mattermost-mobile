// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import UserItem from './user_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}) => of$(value as ClientConfig)),
    );
    const isCustomStatusEnabled = config.pipe(
        switchMap((cfg) => of$(cfg.EnableCustomUserStatuses === 'true')),
    );
    const showFullName = config.pipe(
        switchMap((cfg) => of$(cfg.ShowFullName === 'true')),
    );
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );
    return {
        isCustomStatusEnabled,
        showFullName,
        currentUserId,
    };
});

export default withDatabase(enhanced(UserItem));
