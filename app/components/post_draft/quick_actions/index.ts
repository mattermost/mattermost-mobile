// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {observeHasAvailableAgents} from '@agents/queries/agents';
import {Preferences} from '@constants';
import {observeIsBoREnabled, observeIsPostPriorityEnabled} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeConfigBooleanValue, observeMaxFileCount} from '@queries/servers/system';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileCount = observeMaxFileCount(database);
    const allowDownloadLogs = observeConfigBooleanValue(database, 'AllowDownloadLogs', true);
    const attachLogsEnabled = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.ADVANCED_SETTINGS, Preferences.ATTACH_APP_LOGS).
        observeWithColumns(['value']).
        pipe(map((prefs) => prefs[0]?.value === 'true'));

    return {
        canUploadFiles,
        isAgentsEnabled: observeHasAvailableAgents(database),
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        isBoREnabled: observeIsBoREnabled(database),
        maxFileCount,
        showAttachLogs: combineLatest([allowDownloadLogs, attachLogsEnabled]).pipe(
            map(([allowed, enabled]) => allowed && enabled),
        ),
    };
});

export default React.memo(withDatabase(enhanced(QuickActions)));
