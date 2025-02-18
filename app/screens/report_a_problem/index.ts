// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import {withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from '@nozbe/watermelondb/utils/rx';
import {of as of$} from 'rxjs';

import {observeConfigBooleanValue, observeConfigValue, observeLicense, observeReportAProblemMetadata} from '@queries/servers/system';

import ReportProblem from './report_problem';

const enhanced = withObservables([], ({database}) => {
    return {
        reportAProblemType: observeConfigValue(database, 'ReportAProblemType'),
        reportAProblemMail: observeConfigValue(database, 'ReportAProblemMail'),
        reportAProblemLink: observeConfigValue(database, 'ReportAProblemLink'),
        siteName: observeConfigValue(database, 'SiteName'),
        allowDownloadLogs: observeConfigBooleanValue(database, 'AllowDownloadLogs', true),
        isLicensed: observeLicense(database).pipe(switchMap((license) => (license ? of$(license.IsLicensed) : of$(false)))),
        metadata: observeReportAProblemMetadata(database),
    };
});

export default withDatabase(enhanced(ReportProblem));
