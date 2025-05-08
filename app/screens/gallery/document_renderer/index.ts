// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';

import DocumentRenderer from './document_renderer';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        canDownloadFiles: observeCanDownloadFiles(database),
        enableSecureFilePreview: observeEnableSecureFilePreview(database),
    };
});

export default withDatabase(enhanced(DocumentRenderer));
