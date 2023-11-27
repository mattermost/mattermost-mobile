// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeCurrentChannelId, observeCurrentTeamId} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import AdditionalTabletView from './additional_tablet_view';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    onTeam: observeCurrentTeamId(database).pipe(
        switchMap((id) => of$(Boolean(id))),
        distinctUntilChanged(),
    ),
    currentChannelId: observeCurrentChannelId(database),
    isCRTEnabled: observeIsCRTEnabled(database),
}));

export default withDatabase(enhanced(AdditionalTabletView));
