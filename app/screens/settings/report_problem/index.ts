// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue, observeConfigValue, observeReportAProblemMetadata} from '@queries/servers/system';

import ReportProblem from './report_problem';

const enhanced = withObservables([], ({database}) => ({
    allowDownloadLogs: observeConfigBooleanValue(database, 'AllowDownloadLogs', true),
    reportAProblemMail: observeConfigValue(database, 'ReportAProblemMail'),
    reportAProblemType: observeConfigValue(database, 'ReportAProblemType'),
    siteName: observeConfigValue(database, 'SiteName'),
    metadata: observeReportAProblemMetadata(database),
}));

export default withDatabase(enhanced(ReportProblem));
