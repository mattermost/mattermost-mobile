// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Model} from '@nozbe/watermelondb';

/**
 * Marks a server's local database as being in a non-default persistence state
 * - 'wiped': database has been wiped and is awaiting recovery on next reconnection.
 * - 'zero-persistence': server runs with no persistence on disk.
 */
export type PersistenceFlag = '' | 'wiped' | 'zero-persistence';

/**
 * The Server model will help us to identify the various servers a user will log in; in the context of
 * multi-server support system.  The db_path field will hold the App-Groups file-path
 */
declare class ServersModel extends Model {
    /** table (name) : servers */
    static table: string;

    /** db_path : The file path where the database is stored */
    dbPath: string;

    /** display_name : The server display name */
    displayName: string;

    /** url : The online address for the Mattermost server */
    url: string;

    /** last_active_at: The last time this server was active */
    lastActiveAt: number;

    /** diagnostic_id: Determines the installation identifier of a server */
    identifier: string;

    /** persistence_flag: Marker for non-default persistence behavior on this server's local database */
    persistenceFlag: PersistenceFlag;
}

export default ServersModel;
