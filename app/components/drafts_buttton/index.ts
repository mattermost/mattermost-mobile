// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Screens} from '@constants';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';

import DraftsButton from './drafts_button';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    shouldHighlightActive: boolean;
}

const enhanced = withObservables(['shouldHighlightActive'], ({database, shouldHighlightActive}: Props) => {
    const currentTeamId = observeCurrentTeamId(database);
    const isActiveTab = currentTeamId.pipe(
        switchMap(
            (teamId) => observeTeamLastChannelId(database, teamId),
        ),
        switchMap((lastChannelId) => of$(lastChannelId === Screens.GLOBAL_DRAFTS || (shouldHighlightActive && !lastChannelId))),
        distinctUntilChanged(),
    );

    return {
        isActiveTab,
    };
});

export default withDatabase(enhanced(DraftsButton));
