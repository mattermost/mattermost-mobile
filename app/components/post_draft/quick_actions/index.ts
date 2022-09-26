// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeConfig, observeIsPostPriorityEnabled, observeLicense} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);
    const license = observeLicense(database);

    const canUploadFiles = combineLatest([config, license]).pipe(
        switchMap(([c, l]) => of$(
            c?.EnableFileAttachments === 'true' ||
                (l?.IsLicensed !== 'true' && l?.Compliance !== 'true' && c?.EnableMobileFileUpload === 'true'),
        ),
        ),
    );

    const maxFileCount = config.pipe(
        switchMap((cfg) => of$(isMinimumServerVersion(cfg?.Version || '', 6, 0) ? 10 : 5)),
    );

    return {
        canUploadFiles,
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        maxFileCount,
    };
});

export default React.memo(withDatabase(enhanced(QuickActions)));
