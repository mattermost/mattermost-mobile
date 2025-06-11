// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {isMinimumServerVersion} from '@utils/helpers';

import type SystemModel from '@typings/database/models/servers/system';

const MinimumMajorVersion = 0;
const MinimumMinorVersion = 0;
const MinimumPatchVersion = 0;

export function observeIsPlaybooksEnabled(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION),
    ).observe().pipe(
        switchMap((systems) => {
            const version = systems[0]?.value;
            if (!version) {
                return of$(false);
            }

            return of$(isMinimumServerVersion(version, MinimumMajorVersion, MinimumMinorVersion, MinimumPatchVersion));
        }),
    );
}
