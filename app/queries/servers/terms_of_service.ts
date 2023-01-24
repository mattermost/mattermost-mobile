// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeLicense, observeConfigBooleanValue, observeConfigValue, observeConfigIntValue} from './system';
import {observeCurrentUser} from './user';

import type {Database} from '@nozbe/watermelondb';

export const observeShowToS = (database: Database) => {
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

    return showToS;
};
