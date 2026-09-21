// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue, observeConfigValue} from '@queries/servers/system';

import ReportProblem from './report_problem';

const enhanced = withObservables([], ({database}) => ({
    allowDownloadLogs: observeConfigBooleanValue(database, 'AllowDownloadLogs', true),
    reportAProblemType: observeConfigValue(database, 'ReportAProblemType'),
}));

export default withDatabase(enhanced(ReportProblem));
