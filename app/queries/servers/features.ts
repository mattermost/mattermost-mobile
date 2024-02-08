// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {GM_AS_DM_VERSION} from '@constants/versions';
import {isMinimumServerVersion} from '@utils/helpers';

import {observeConfigValue} from './system';

import type {Database} from '@nozbe/watermelondb';

export const observeHasGMasDMFeature = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v, ...GM_AS_DM_VERSION))),
    );
};
