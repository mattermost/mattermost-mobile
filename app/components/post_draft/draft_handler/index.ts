// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {DEFAULT_SERVER_MAX_FILE_SIZE} from '@constants/post_draft';
import {observeCanUploadFiles, observeConfigIntValue, observeConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import DraftHandler from './draft_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 6, 0) ? 10 : 5)),
    );

    return {
        maxFileSize,
        maxFileCount,
        canUploadFiles,
    };
});

export default React.memo(withDatabase(enhanced(DraftHandler)));
