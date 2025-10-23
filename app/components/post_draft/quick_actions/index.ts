// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeIsAIEnabled} from '@queries/servers/ai';
import {observeIsPostPriorityEnabled} from '@queries/servers/post';
import {observeCanUploadFiles} from '@queries/servers/security';
import {observeMaxFileCount} from '@queries/servers/system';

import QuickActions from './quick_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canUploadFiles = observeCanUploadFiles(database);
    const maxFileCount = observeMaxFileCount(database);

    return {
        canUploadFiles,
        isAIEnabled: observeIsAIEnabled(),
        isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
        maxFileCount,
    };
});

export default React.memo(withDatabase(enhanced(QuickActions)));
