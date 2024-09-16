// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from '@nozbe/watermelondb/utils/rx';
import React from 'react';

import {observeDraftCount} from '@app/queries/servers/drafts';
import {observeCurrentChannelId, observeCurrentTeamId} from '@app/queries/servers/system';

import DraftsButton from './drafts_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const draftsCount = currentTeamId.pipe(
        switchMap((teamId) => observeDraftCount(database, teamId)), // Observe the draft count
    );

    // const allDrafts = currentTeamId.pipe(
    //     switchMap((teamId) => observeAllDrafts(database, teamId).observeWithColumns(['message', 'files', 'metadata'])),
    // );
    // const files = allDrafts.pipe(switchMap((drafts) => of$(drafts.map((d) => d.files))));
    // const messages = allDrafts.pipe(switchMap((drafts) => of$(drafts.map((d) => d.message))));

    return {
        currentChannelId: observeCurrentChannelId(database),
        draftsCount,
    };
});

export default React.memo(withDatabase(enhanced(DraftsButton)));
