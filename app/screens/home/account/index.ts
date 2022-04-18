// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {isCustomStatusExpirySupported, isMinimumServerVersion} from '@utils/helpers';

import AccountScreen from './account';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const showFullName = config.pipe((switchMap((cfg) => of$(cfg?.ShowFullName === 'true'))));
    const enableCustomUserStatuses = config.pipe((switchMap((cfg) => {
        return of$(cfg?.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(cfg?.Version || '', 5, 36));
    })));
    const version = config.pipe(
        switchMap((cfg) => of$(cfg?.Version || '')),
    );
    const customStatusExpirySupported = config.pipe(
        switchMap((cfg) => of$(isCustomStatusExpirySupported(cfg?.Version || ''))),
    );

    return {
        currentUser: observeCurrentUser(database),
        enableCustomUserStatuses,
        customStatusExpirySupported,
        showFullName,
        version,
    };
});

export default withDatabase(enhanced(AccountScreen));
