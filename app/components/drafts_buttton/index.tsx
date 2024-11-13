// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeCurrentChannelId, observeCurrentTeamId} from '@queries/servers/system';

import DraftsButton from './drafts_button';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    teamId: string;
} & WithDatabaseArgs;

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

const enhanced = withObservables(['teamId'], ({database, teamId}: Props) => {
    const draftsCount = observeDraftCount(database, teamId); // Observe the draft count
    return {
        currentChannelId: observeCurrentChannelId(database),
        draftsCount,
    };
});

export default React.memo(withDatabase(withTeamId(enhanced(DraftsButton))));
