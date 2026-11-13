// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';

import type SystemModel from '@typings/database/models/servers/system';

function queryTaskRequirementsEnabled(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED),
    );
}

export function observeIsTaskRequirementsEnabled(database: Database) {
    return queryTaskRequirementsEnabled(database).observeWithColumns(['value']).pipe(
        switchMap((systems: SystemModel[]) => {
            return of$(Boolean(systems[0]?.value));
        }),
    );
}

export async function fetchIsTaskRequirementsEnabled(database: Database) {
    const systems = await queryTaskRequirementsEnabled(database).fetch();
    return Boolean(systems[0]?.value);
}
