// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigValue, observeCurrentUserId, observeCurrentTeamId} from '@queries/servers/system';

import ReportProblem from './report_problem';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const buildNumber = observeConfigValue(database, 'BuildNumber');
    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);
    const supportEmail = observeConfigValue(database, 'SupportEmail');
    const version = observeConfigValue(database, 'Version');

    return {
        buildNumber,
        currentTeamId,
        currentUserId,
        supportEmail,
        version,
    };
});

export default withDatabase(enhanced(ReportProblem));
