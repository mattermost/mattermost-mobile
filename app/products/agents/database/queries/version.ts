// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION} from '@agents/constants/version';
import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {isMinimumServerVersion} from '@utils/helpers';

import type SystemModel from '@typings/database/models/servers/system';

function queryAgentsVersion(database: Database) {
    return database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).query(
        Q.where('id', SYSTEM_IDENTIFIERS.AGENTS_VERSION),
    );
}

export function isAgentsVersionSupported(version: string) {
    return Boolean(version) && isMinimumServerVersion(version, MINIMUM_MAJOR_VERSION, MINIMUM_MINOR_VERSION, MINIMUM_PATCH_VERSION);
}

export async function fetchAgentsVersion(database: Database): Promise<string> {
    const systems = await queryAgentsVersion(database).fetch();
    return systems[0]?.value ?? '';
}

export async function fetchIsAgentsVersionSupported(database: Database) {
    return isAgentsVersionSupported(await fetchAgentsVersion(database));
}

export function observeAgentsVersion(database: Database) {
    return queryAgentsVersion(database).observeWithColumns(['value']).pipe(
        map((systems): string => systems[0]?.value ?? ''),
        distinctUntilChanged(),
    );
}

export function observeIsAgentsVersionSupported(database: Database) {
    return observeAgentsVersion(database).pipe(
        map(isAgentsVersionSupported),
        distinctUntilChanged(),
    );
}
