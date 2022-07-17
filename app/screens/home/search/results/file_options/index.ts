// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCanDownloadFiles} from '@queries/servers/file';
import {observeConfigBooleanValue} from '@queries/servers/system';

import FileOptions from './file_options';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enablePublicLink = observeConfigBooleanValue(database, 'EnablePublicLink');
    const canDownloadFiles = observeCanDownloadFiles(database);
    return {
        canDownloadFiles,
        enablePublicLink,
    };
});

export default withDatabase(enhanced(FileOptions));
