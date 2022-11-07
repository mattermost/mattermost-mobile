// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCanUploadFiles, observeConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canUploadFiles = observeCanUploadFiles(database);

    const maxFileCount = observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 6, 0) ? 10 : 5)),
    );

    return {
        canUploadFiles,
        maxFileCount,
    };
});

export default React.memo(withDatabase(enhanced(QuickActions)));
