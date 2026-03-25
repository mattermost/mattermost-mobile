// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

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
    const attachLogsPref = queryPreferencesByCategoryAndName(
        database,
        Preferences.CATEGORIES.ADVANCED_SETTINGS,
        Preferences.ATTACH_APP_LOGS,
    ).observe();

    return {
        canUploadFiles,
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        isBoREnabled: observeIsBoREnabled(database),
        maxFileCount,
        showAttachLogs: combineLatest([allowDownloadLogs, attachLogsPref]).pipe(
            map(([allowed, prefs]) => allowed && prefs?.[0]?.value === 'true'),
        ),
    };
});

export default React.memo(withDatabase(enhanced(QuickActions)));
