// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {queryAllMyChannelsForTeam} from '@queries/servers/channel';
import {observeConfigBooleanValue, observeConfigIntValue, observeConfigValue, observeCurrentTeamId, observeLicense} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelsList from './channel_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isLicensed = observeLicense(database).pipe(
        switchMap((lcs) => (lcs ? of$(lcs.IsLicensed === 'true') : of$(false))),
    );
    const currentUser = observeCurrentUser(database);
    const customTermsOfServiceEnabled = observeConfigBooleanValue(database, 'EnableCustomTermsOfService');
    const customTermsOfServiceId = observeConfigValue(database, 'CustomTermsOfServiceId');
    const customTermsOfServicePeriod = observeConfigIntValue(database, 'CustomTermsOfServiceReAcceptancePeriod');

    const showToS = combineLatest([
        isLicensed,
        customTermsOfServiceEnabled,
        currentUser,
        customTermsOfServiceId,
        customTermsOfServicePeriod,
    ]).pipe(
        switchMap(([lcs, cfg, user, id, period]) => {
            if (!lcs || !cfg) {
                return of$(false);
            }

            if (user?.termsOfServiceId !== id) {
                return of$(true);
            }

            const timeElapsed = Date.now() - (user?.termsOfServiceCreateAt || 0);
            return of$(timeElapsed > (period * 24 * 60 * 60 * 1000));
        }),
        distinctUntilChanged(),
    );

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        teamsCount: queryMyTeams(database).observeCount(false),
        channelsCount: observeCurrentTeamId(database).pipe(
            switchMap((id) => (id ? queryAllMyChannelsForTeam(database, id).observeCount() : of$(0))),
        ),
        isLicensed,
        showToS,
    };
});

export default withDatabase(enhanced(ChannelsList));
