// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest, first} from 'rxjs';
import {switchMap, distinctUntilChanged, map} from 'rxjs/operators';

import {Screens} from '@constants';
import {observeCurrentChannelId, observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import AdditionalTabletView from './additional_tablet_view';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const currentChannelId = observeCurrentChannelId(database);
    const isCRTEnabled = observeIsCRTEnabled(database);
    const lastChannelId = currentTeamId.pipe(
        switchMap((teamId) => observeTeamLastChannelId(database, teamId)),
    );

    const intialView = combineLatest([currentChannelId, lastChannelId, isCRTEnabled]).pipe(
        first(),
        map(([channelId, lastId, crtEnabled]) => {
            if (!channelId && lastId === Screens.GLOBAL_DRAFTS) {
                return Screens.GLOBAL_DRAFTS;
            } else if (crtEnabled && !channelId) {
                return Screens.GLOBAL_THREADS;
            }
            return Screens.CHANNEL;
        }),
    );

    return {
        onTeam: currentTeamId.pipe(
            switchMap((id) => of$(Boolean(id))),
            distinctUntilChanged(),
        ),
        intialView,
    };
});

export default withDatabase(enhanced(AdditionalTabletView));
