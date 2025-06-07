// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeAllowPdfLinkNavigation} from '@queries/servers/security';
import {observeConfigValue} from '@queries/servers/system';

import PdfViewer from './pdf_viewer';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    fileId: string;
}

const enhance = withObservables([], ({database}: Props) => ({
    siteURL: observeConfigValue(database, 'SiteURL'),
    allowPdfLinkNavigation: observeAllowPdfLinkNavigation(database),
}));

export default withDatabase(enhance(PdfViewer));
