// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, map} from '@nozbe/watermelondb/utils/rx';

import {observeFileById} from '@queries/servers/file';
import {observeAllowPdfLinkNavigation} from '@queries/servers/security';
import {observeConfigValue} from '@queries/servers/system';

import PdfViewer from './pdf_viewer';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    fileId: string;
}

const enhance = withObservables(['fileId'], ({database, fileId}: Props) => ({
    siteURL: observeConfigValue(database, 'SiteURL'),
    isBlocked: observeFileById(database, fileId).pipe(
        map((file) => (file?.isBlocked ?? false)),
        distinctUntilChanged(),
    ),
    allowPdfLinkNavigation: observeAllowPdfLinkNavigation(database),
}));

export default withDatabase(enhance(PdfViewer));
