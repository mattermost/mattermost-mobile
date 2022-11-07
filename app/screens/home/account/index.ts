// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeConfigValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {isCustomStatusExpirySupported, isMinimumServerVersion} from '@utils/helpers';

import AccountScreen from './account';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const showFullName = observeConfigBooleanValue(database, 'ShowFullName');
    const cfgEnableCustomUserStatuses = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');

    const version = observeConfigValue(database, 'Version');
    const customStatusExpirySupported = version.pipe(
        switchMap((v) => of$(isCustomStatusExpirySupported(v || ''))),
    );
    const enableCustomUserStatuses = combineLatest([cfgEnableCustomUserStatuses, version]).pipe(
        switchMap(([cfg, v]) => of$(cfg && isMinimumServerVersion(v || '', 5, 36))),
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
