// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';

import {DEFAULT_SERVER_MAX_FILE_SIZE} from '@constants/post_draft';
import {observeCanUploadFiles, observeConfigIntValue, observeMaxFileCount} from '@queries/servers/system';

import DraftHandler from './draft_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileSize = observeConfigIntValue(database, 'MaxFileSize', DEFAULT_SERVER_MAX_FILE_SIZE);
    const maxFileCount = observeMaxFileCount(database);

    return {
        maxFileSize,
        canUploadFiles,
        maxFileCount,
    };
});

export default React.memo(withDatabase(enhanced(DraftHandler)));
