// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {observePreferenceAsBool} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeConfigValue, observeCurrentUserId, observeLicense, observeReportAProblemMetadata} from '@queries/servers/system';

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
        currentUserId: observeCurrentUserId(database),
        attachLogsEnabled: observePreferenceAsBool(database, Preferences.CATEGORIES.ADVANCED_SETTINGS, Preferences.ATTACH_APP_LOGS),
    };
});

export default withDatabase(enhanced(ReportProblem));
