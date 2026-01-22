// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {observeIsAgentsEnabled} from '@agents/queries/agents';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {withServerUrl} from '@context/server';
import {observeIsPostPriorityEnabled} from '@queries/servers/post';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeMaxFileCount} from '@queries/servers/system';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({database, serverUrl}: EnhancedProps) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileCount = observeMaxFileCount(database);

    return {
        canUploadFiles,
        isAgentsEnabled: observeIsAgentsEnabled(serverUrl),
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        maxFileCount,
    };
});

export default React.memo(withDatabase(withServerUrl(enhanced(QuickActions))));
