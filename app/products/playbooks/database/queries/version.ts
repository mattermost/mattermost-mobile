// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@playbooks/constants/version';
import {isMinimumServerVersion} from '@utils/helpers';

import type SystemModel from '@typings/database/models/servers/system';

function queryPlaybooksVersion(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION),
    );
}

function isPlaybooksEnabledFromSystemModel(systems: SystemModel[]) {
    const version = systems[0]?.value;
    if (!version) {
        return false;
    }

    return isMinimumServerVersion(version, MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION);
}

export async function fetchIsPlaybooksEnabled(database: Database) {
    const systems = await queryPlaybooksVersion(database).fetch();
    return isPlaybooksEnabledFromSystemModel(systems);
}

export function observeIsPlaybooksEnabled(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION),
    ).observeWithColumns(['value']).pipe(
        switchMap((systems) => {
            return of$(isPlaybooksEnabledFromSystemModel(systems));
        }),
    );
}
