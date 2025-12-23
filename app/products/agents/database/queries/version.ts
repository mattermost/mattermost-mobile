// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@agents/constants/version';
import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {isMinimumServerVersion} from '@utils/helpers';

import type SystemModel from '@typings/database/models/servers/system';

function queryAgentsVersion(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.AGENTS_VERSION),
    );
}

function isAgentsEnabledFromSystemModel(systems: SystemModel[]) {
    const version = systems[0]?.value;
    if (!version) {
        return false;
    }

    return isMinimumServerVersion(version, MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION);
}

export async function fetchIsAgentsEnabled(database: Database) {
    const systems = await queryAgentsVersion(database).fetch();
    return isAgentsEnabledFromSystemModel(systems);
}

export function observeIsAgentsEnabled(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.AGENTS_VERSION),
    ).observeWithColumns(['value']).pipe(
        switchMap((systems) => {
            return of$(isAgentsEnabledFromSystemModel(systems));
        }),
    );
}
