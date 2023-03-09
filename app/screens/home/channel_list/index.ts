// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {queryAllMyChannelsForTeam} from '@queries/servers/channel';
import {observeCurrentTeamId, observeLicense} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {observeShowToS} from '@queries/servers/terms_of_service';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import ChannelsList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isLicensed = observeLicense(database).pipe(
        switchMap((lcs) => (lcs ? of$(lcs.IsLicensed === 'true') : of$(false))),
    );

    const teamsCount = queryMyTeams(database).observeCount(false);

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        hasTeams: teamsCount.pipe(
            switchMap((v) => of$(v > 0)),
            distinctUntilChanged(),
        ),
        hasMoreThanOneTeam: teamsCount.pipe(
            switchMap((v) => of$(v > 1)),
            distinctUntilChanged(),
        ),
        hasChannels: observeCurrentTeamId(database).pipe(
            switchMap((id) => (id ? queryAllMyChannelsForTeam(database, id).observeCount(false) : of$(0))),
            switchMap((v) => of$(v > 0)),
            distinctUntilChanged(),
        ),
        isLicensed,
        showToS: observeShowToS(database),
    };
});

export default withDatabase(enhanced(ChannelsList));
