// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';

import {observeAllDrafts} from '@app/queries/servers/drafts';
import {observeCurrentTeamId} from '@app/queries/servers/system';
import {observeCurrentUser} from '@app/queries/servers/user';

import GlobalDraftsList from './global_drafts_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

type Props = {
    teamId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['teamId'], ({database, teamId}: Props) => {
    const allDrafts = observeAllDrafts(database, teamId);
    const currentUser = observeCurrentUser(database);

    return {
        allDrafts,
        currentUser,
    };
});

export default React.memo(withDatabase(withTeamId(enhanced(GlobalDraftsList))));
