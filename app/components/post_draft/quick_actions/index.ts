// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeIsAgentsEnabled} from '@agents/queries/agents';
import {Preferences} from '@constants';
import {RenderPermissionAction} from '@constants/access_control';
import {withServerUrl} from '@context/server';
import {observeIsBoREnabled, observeIsPostPriorityEnabled} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeRenderPermission} from '@queries/servers/render_permissions';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeConfigBooleanValue, observeMaxFileCount} from '@queries/servers/system';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    channelId: string;
    serverUrl: string;
}

const enhanced = withObservables(['channelId'], ({database, channelId, serverUrl}: EnhancedProps) => {
    // Denied by policy looks the same as disabled by config: dimmed and inert.
    const canUploadFiles = combineLatest([
        observeCanUploadFiles(database),
        observeRenderPermission(database, serverUrl, channelId, RenderPermissionAction.UploadFileAttachment, true),
    ]).pipe(
        map(([allowedByConfig, allowedByPolicy]) => allowedByConfig && allowedByPolicy),
        distinctUntilChanged(),
    );
    const maxFileCount = observeMaxFileCount(database);
    const allowDownloadLogs = observeConfigBooleanValue(database, 'AllowDownloadLogs', true);
    const attachLogsEnabled = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.ADVANCED_SETTINGS, Preferences.ATTACH_APP_LOGS).
        observeWithColumns(['value']).
        pipe(map((prefs) => prefs[0]?.value === 'true'));

    return {
        canUploadFiles,
        isAgentsEnabled: observeIsAgentsEnabled(serverUrl),
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        isBoREnabled: observeIsBoREnabled(database),
        maxFileCount,
        showAttachLogs: combineLatest([allowDownloadLogs, attachLogsEnabled]).pipe(
            map(([allowed, enabled]) => allowed && enabled),
        ),
    };
});

export default React.memo(withDatabase(withServerUrl(enhanced(QuickActions))));
