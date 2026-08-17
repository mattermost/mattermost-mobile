// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, startWith} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeIncomingCalls} from '@calls/state';
import {queryAllMyChannelsForTeam} from '@queries/servers/channel';
import {observeCurrentTeamId, observeCurrentUserId, observeLicense} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {observeShowToS} from '@queries/servers/terms_of_service';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelsList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isLicensed = observeLicense(database).pipe(
        switchMap((lcs) => (lcs ? of$(lcs.IsLicensed === 'true') : of$(false))),
    );

    const teamsCount = queryMyTeams(database).observeCount(false);

    const showIncomingCalls = observeIncomingCalls().pipe(
        switchMap((ics) => of$(ics.incomingCalls.length > 0)),
        startWith(false),
        distinctUntilChanged(),
    );

    return {
        isCRTEnabled: observeIsCRTEnabled(database).pipe(startWith(false)),

        // Real SQLite values; seeding would skip select_team or paint a hollow list
        hasTeams: teamsCount.pipe(
            switchMap((v) => of$(v > 0)),
            distinctUntilChanged(),
        ),
        hasChannels: observeCurrentTeamId(database).pipe(
            switchMap((id) => (id ? queryAllMyChannelsForTeam(database, id).observeCount(false) : of$(0))),
            switchMap((v) => of$(v > 0)),
            distinctUntilChanged(),
        ),
        hasMoreThanOneTeam: teamsCount.pipe(
            switchMap((v) => of$(v > 1)),
            startWith(false),
            distinctUntilChanged(),
        ),
        isLicensed: isLicensed.pipe(startWith(false)),
        showToS: observeShowToS(database).pipe(
            startWith(false),
            distinctUntilChanged(),
        ),
        currentUserId: observeCurrentUserId(database).pipe(startWith<string | undefined>(undefined)),
        hasCurrentUser: observeCurrentUser(database).pipe(
            switchMap((u) => of$(Boolean(u))),
            startWith<boolean | undefined>(undefined),
            distinctUntilChanged(),
        ),
        showIncomingCalls,
        currentTeamId: observeCurrentTeamId(database).pipe(
            startWith(''),
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(ChannelsList));
