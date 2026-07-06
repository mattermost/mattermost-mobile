// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {CHANNEL_BOOKMARKS_VERSION, GM_AS_DM_VERSION} from '@constants/versions';
import {isMinimumServerVersion} from '@utils/helpers';

import {observeConfigValue, observeLicense} from './system';

import type {Database} from '@nozbe/watermelondb';

export const observeHasGMasDMFeature = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v, ...GM_AS_DM_VERSION))),
    );
};

export const observeIsChannelBookmarksEnabled = (database: Database) => {
    return combineLatest([
        observeConfigValue(database, 'Version'),
        observeLicense(database),
    ]).pipe(
        switchMap(([v, license]) => of$(
            isMinimumServerVersion(v, ...CHANNEL_BOOKMARKS_VERSION) &&
            license?.IsLicensed === 'true',
        )),
    );
};
